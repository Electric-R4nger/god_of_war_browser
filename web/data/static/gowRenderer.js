var gr_instance;
var gl;

function grMesh(vertexArray, indexArray) {
	this.refs = 0;
	this.indexesCount = indexArray.length;
	
	this.bufferVertex = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferVertex);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexArray), gl.STATIC_DRAW);
	
	this.bufferIndex = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bufferIndex);
	this.bufferIndexType = (indexArray.length > 255) ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT;
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, (this.bufferIndexType === gl.UNSIGNED_SHORT) ? (new Uint16Array(indexArray)) : (new Uint8Array(indexArray)), gl.STATIC_DRAW);
    
	this.bufferBlendColor = undefined;
	this.bufferUV = undefined;
	this.bufferNormals = undefined;
	this.bufferJointIds = undefined;
	this.materialIndex = undefined;
}

grMesh.prototype.setBlendColors = function(data) {
	if (!this.bufferBlendColor) {
		this.bufferBlendColor = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferBlendColor);
	gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(data), gl.STATIC_DRAW);
}

grMesh.prototype.setUVs = function(data, materialIndex) {
	if (!this.bufferUV) {
		this.bufferUV = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferUV);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
	this.materialIndex = materialIndex;
}

grMesh.prototype.setNormals = function(data) {
	if (!this.bufferNormals) {
		this.bufferNormals = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferNormals);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
}

grMesh.prototype.setJointIds = function(data) {
	if (!this.bufferJointIds) {
		this.bufferJointIds = gl.createBuffer();
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferJointIds);
	gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(data), gl.STATIC_DRAW);
}

grMesh.prototype.free = function() {
    if (this.bufferVertex) gl.deleteBuffer(this.bufferVertex);
    if (this.bufferIndex) gl.deleteBuffer(this.bufferIndex);
    if (this.bufferBlendColor) gl.deleteBuffer(this.bufferBlendColor);
    if (this.bufferUV) gl.deleteBuffer(this.bufferUV);
	if (this.bufferNormals) gl.deleteBuffer(this.bufferNormals);
	if (this.bufferJointIds) gl.deleteBuffer(this.bufferJointIds);
}

grMesh.prototype.claim = function() { this.refs ++; }
grMesh.prototype.unclaim = function() { if (--this.refs === 0) this.free(); }

function grModel() {
	this.meshes = [];
	this.materials = [];
	this.skeleton = undefined;
	this.matrix = mat4.create();
}

grModel.prototype.addMesh = function(mesh) {
	mesh.claim();
	this.meshes.push(mesh);
}

grModel.prototype.free = function() {
	for (var i in this.meshes) { this.meshes[i].unclaim(); }
	for (var i in this.materials) { this.materials[i].unclaim(); }
}

function grMaterial() {
	this.refs = 0;
}

grMaterial.prototype.claim = function() { this.refs ++; }
grMaterial.prototype.unclaim = function() { if (--this.refs === 0) this.free(); }

function grCameraTargeted() {
	this.farPlane = 20000.0;
	this.nearPlane = 1.0;
	this.fow = 55.0;
	this.target = [0, 0, 0];
	this.distance = 100.0;
	this.rotation = [45.0, 45.0, 0];
}

grCameraTargeted.prototype.getProjViewMatrix = function() {
    var projMatrix = mat4.create();
    mat4.perspective(projMatrix, glMatrix.toRadian(45), gr_instance.rectX/gr_instance.rectY, this.nearPlane,this.farPlane);
    
	var viewMatrix = mat4.create();
    mat4.translate(viewMatrix, viewMatrix, [0.0, 0.0, -this.distance]);
    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.rotation[0]), [1, 0, 0]);
    mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.rotation[1]), [0, 1, 0]);
	//mat4.rotate(viewMatrix, viewMatrix, glMatrix.toRadian(this.rotation[2]), [0, 0, 1]);
	//mat4.translate(viewMatrix, viewMatrix, [-this.target[0], -this.target[1], -this.target[2]]);
    
    var projViewMatrix = mat4.create();
    mat4.mul(projViewMatrix, projMatrix, viewMatrix);
	
	return projViewMatrix;
}

function grController(viewDomObject) {
	var canvas = $(view).find('canvas');
	var contextNames = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
    for (var i in contextNames) {
        try {
            gl = canvas[0].getContext(contextNames[i]);
        } catch(e) {};
        if (gl) break;
    }
    if (!gl) {
        console.error("Could not initialise WebGL");
		alert("Could not initialize WebGL");
        return;
    }
	
	this.renderChain = undefined;
	this.models = [];
	this.helpers = [];
	this.camera = new grCameraTargeted();
	this.rectX = gl.canvas.width;
	this.rectY = gl.canvas.height;
	
	window.requestAnimationFrame = (function() {
		return window.requestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.oRequestAnimationFrame ||
			window.msRequestAnimationFrame;
	})();

	$(window).resize(this._onResize);
}

function gwInitRenderer(viewDomObject) {
	if (gr_instance) {
		console.warn("grController already created", gr_instance);
		return;
	}
	gr_instance = new grController(viewDomObject);
	gr_instance.changeRenderChain(grRenderChain_Simple);
	gr_instance.onResize();
	gr_instance.requestRedraw();
}

grController.prototype.changeRenderChain = function(chainType) {
	if (this.renderChain)
		this.renderChain.free();
	this.renderChain = new chainType(this);
}

grController.prototype.onResize = function() {
	gl.canvas.width = this.rectX = gl.canvas.clientWidth;
	gl.canvas.height = this.rectY = gl.canvas.clientHeight;
	gl.viewport(0,0, this.rectX,this.rectY);
}
grController.prototype._onResize = function() { gr_instance.onResize(); this.requestRedraw(); }

grController.prototype.render = function() {
	this.renderChain.render(this);
}

grController.prototype.requestRedraw = function() {
	requestAnimationFrame(function() { gr_instance.render(); });
}

grController.prototype.destroyModels = function() {
	for (var i in this.models) {
		this.models[i].free(this);
	}
	this.models.length = 0;
}

grController.prototype.downloadFile = function(link, async) {
	var txt;
	$.ajax({
		url: link,
		async: !!async,
		success: function(data) {
			txt = data;
		}
	});
	return txt;
}

grController.prototype.createShader = function(text, isFragment) {
    var shader = gl.createShader(isFragment ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER);
    gl.shaderSource(shader, text);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(text, gl.getShaderInfoLog(shader));
        return;
    }
    return shader;
}

grController.prototype.createProgram = function(vertexText, fragmentText) {
    var vertexShader = this.createShader(vertexText, false);
	var fragmentShader = this.createShader(fragmentText, true);

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.log("Could not initialise shaders");
		return;
    }
	return shaderProgram;
}

grController.prototype.downloadProgram = function(vertexLink, fragmentLink) {
	var vertexText = this.downloadFile(vertexLink, false);
	var fragmentText = this.downloadFile(fragmentLink, false);	
	if (vertexText && fragmentText)
		return this.createProgram(vertexText, fragmentText);
}
