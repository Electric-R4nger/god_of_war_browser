attribute highp vec3 aVertexPos;
attribute lowp vec4 aVertexColor;
attribute mediump vec2 aVertexUV;
attribute mediump float aVertexJointID;

uniform highp mat4 umModelTransform;
uniform highp mat4 umProjectionView;
uniform lowp vec4 uMaterialColor;
uniform mediump mat4 umJoints[12];
uniform bool uUseJoints;
uniform bool uUseVertexColor;
uniform bool uUseModelTransform;

varying lowp vec4 vVertexColor;
varying mediump vec2 vVertexUV;

void main(void) {
	vec4 pos = vec4(aVertexPos, 1.0);
	if (uUseJoints) {
		pos = umJoints[int(aVertexJointID)] * pos;
	}
	if (uUseModelTransform) {
		pos = vec4((umModelTransform * pos).xyz, 1.0);
	} else {
		pos = vec4(pos.xyz, 1.0);
	}
	//vVertexColor = vec4(aVertexJointID / 128.0, aVertexJointID / 4.0, aVertexJointID / 32.0, 1.0);
	if (uUseVertexColor) {
		vVertexColor = aVertexColor * (256.0 / 128.0);
	} else {
		vVertexColor = vec4(1.0);
	}
	gl_Position = umProjectionView * pos;	
	vVertexUV = aVertexUV;
}
