import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { characterType, rigComplexity, modelUrl } = body

    if (!characterType || !rigComplexity) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: characterType and rigComplexity are required" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Auto-rigger request:', { characterType, rigComplexity, modelUrl })

    // Generate AI-powered rigging plan based on character type and complexity
    const rigPlan = generateRigPlan(characterType, rigComplexity)

    // Generate download URLs for rig files (in production, these would be real generated files)
    const rigFiles = generateRigFiles(characterType, rigComplexity)

    const result = {
      rigPlan,
      rigFiles,
      metadata: {
        characterType,
        rigComplexity,
        modelUrl,
        generatedAt: new Date().toISOString(),
        compatibility: {
          blender: true,
          maya: true,
          unreal: rigComplexity !== 'simple',
          unity: true
        }
      }
    }

    console.log('Auto-rigger output:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in auto-rigger function:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})

function generateRigPlan(characterType: string, rigComplexity: string) {
  const baseBones = {
    humanoid: ['Root', 'Pelvis', 'Spine1', 'Spine2', 'Spine3', 'Neck', 'Head'],
    creature: ['Root', 'Spine1', 'Spine2', 'Spine3', 'Neck', 'Head', 'Tail1', 'Tail2'],
    vehicle: ['Root', 'Chassis', 'Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR']
  }

  const limbBones = {
    humanoid: ['L_Shoulder', 'L_UpperArm', 'L_LowerArm', 'L_Hand', 'R_Shoulder', 'R_UpperArm', 'R_LowerArm', 'R_Hand',
               'L_UpperLeg', 'L_LowerLeg', 'L_Foot', 'R_UpperLeg', 'R_LowerLeg', 'R_Foot'],
    creature: ['L_FrontLeg1', 'L_FrontLeg2', 'L_FrontPaw', 'R_FrontLeg1', 'R_FrontLeg2', 'R_FrontPaw',
               'L_BackLeg1', 'L_BackLeg2', 'L_BackPaw', 'R_BackLeg1', 'R_BackLeg2', 'R_BackPaw'],
    vehicle: ['Door_FL', 'Door_FR', 'Hood', 'Trunk']
  }

  let bones = [...(baseBones[characterType as keyof typeof baseBones] || baseBones.humanoid)]
  
  if (rigComplexity !== 'simple') {
    bones = [...bones, ...(limbBones[characterType as keyof typeof limbBones] || limbBones.humanoid)]
  }

  if (rigComplexity === 'advanced') {
    const facialBones = ['Jaw', 'L_Eye', 'R_Eye', 'L_Eyebrow', 'R_Eyebrow']
    const fingerBones = ['L_Thumb1', 'L_Thumb2', 'L_Index1', 'L_Index2', 'L_Middle1', 'L_Middle2']
    bones = [...bones, ...facialBones, ...fingerBones]
  }

  const controllers = bones.map(bone => ({
    name: `${bone}_CTRL`,
    type: 'control',
    parentBone: bone,
    color: bone.includes('L_') ? 'blue' : bone.includes('R_') ? 'red' : 'yellow'
  }))

  return {
    bones,
    controllers,
    ikChains: rigComplexity !== 'simple' ? [
      { name: 'L_Arm_IK', bones: ['L_UpperArm', 'L_LowerArm', 'L_Hand'] },
      { name: 'R_Arm_IK', bones: ['R_UpperArm', 'R_LowerArm', 'R_Hand'] },
      { name: 'L_Leg_IK', bones: ['L_UpperLeg', 'L_LowerLeg', 'L_Foot'] },
      { name: 'R_Leg_IK', bones: ['R_UpperLeg', 'R_LowerLeg', 'R_Foot'] }
    ] : [],
    constraints: rigComplexity === 'advanced' ? [
      { type: 'LookAt', target: 'Head', driver: 'Eye_Target' },
      { type: 'IK', target: 'L_Hand', chain: 'L_Arm_IK' },
      { type: 'IK', target: 'R_Hand', chain: 'R_Arm_IK' }
    ] : []
  }
}

function generateRigFiles(characterType: string, rigComplexity: string) {
  const baseUrl = "https://raw.githubusercontent.com/nollywood-rigs"
  
  return {
    blender: `${baseUrl}/blender/${characterType}_${rigComplexity}.blend`,
    maya: `${baseUrl}/maya/${characterType}_${rigComplexity}.ma`,
    fbx: `${baseUrl}/fbx/${characterType}_${rigComplexity}.fbx`,
    unreal: rigComplexity !== 'simple' ? `${baseUrl}/unreal/${characterType}_${rigComplexity}.uasset` : null,
    unity: `${baseUrl}/unity/${characterType}_${rigComplexity}.prefab`,
    documentation: `${baseUrl}/docs/${characterType}_${rigComplexity}_guide.pdf`
  }
}