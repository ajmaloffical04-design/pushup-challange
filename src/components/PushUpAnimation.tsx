import React, { useEffect, useRef, useState } from 'react';
import { PUSH_UP_VARIATIONS, PushUpType } from '../types';

interface PushUpAnimationProps {
  type: PushUpType;
  autoPlay?: boolean;
  speed?: number; // 0.6 | 1 | 1.4
  manualProgress?: number | null; // 0..1 when scrubbing
  repTrigger?: number; // increment to trigger a crisp single push-up rep
  compact?: boolean;
  className?: string;
}

interface JointPose {
  ankle: [number, number];
  knee: [number, number];
  hip: [number, number];
  shoulder: [number, number];
  head: [number, number];
  elbow: [number, number];
  wrist: [number, number];
  backArmElbow: [number, number];
  backArmWrist: [number, number];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPoint(p1: [number, number], p2: [number, number], t: number): [number, number] {
  return [lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t)];
}

function lerpPose(top: JointPose, bottom: JointPose, t: number): JointPose {
  return {
    ankle: lerpPoint(top.ankle, bottom.ankle, t),
    knee: lerpPoint(top.knee, bottom.knee, t),
    hip: lerpPoint(top.hip, bottom.hip, t),
    shoulder: lerpPoint(top.shoulder, bottom.shoulder, t),
    head: lerpPoint(top.head, bottom.head, t),
    elbow: lerpPoint(top.elbow, bottom.elbow, t),
    wrist: lerpPoint(top.wrist, bottom.wrist, t),
    backArmElbow: lerpPoint(top.backArmElbow, bottom.backArmElbow, t),
    backArmWrist: lerpPoint(top.backArmWrist, bottom.backArmWrist, t),
  };
}

// Biomechanically distinct poses for each of the 4 push-up variations
const VARIATION_POSES: Record<PushUpType, { top: JointPose; bottom: JointPose }> = {
  // 1. Shoulder — Pike Push-Up (high inverted-V hips, steep overhead press path)
  shoulder: {
    top: {
      ankle: [72, 186],
      knee: [110, 140],
      hip: [152, 82],
      shoulder: [232, 128],
      head: [262, 146],
      elbow: [242, 160],
      wrist: [252, 190],
      backArmElbow: [230, 158],
      backArmWrist: [240, 188],
    },
    bottom: {
      ankle: [72, 186],
      knee: [114, 144],
      hip: [164, 96],
      shoulder: [244, 164],
      head: [282, 180],
      elbow: [220, 152],
      wrist: [252, 190],
      backArmElbow: [212, 154],
      backArmWrist: [240, 188],
    },
  },
  // 2. Bicep — Reverse-Grip / Pseudo-Planche Push-Up (lean forward, hands lower by ribs)
  bicep: {
    top: {
      ankle: [54, 184],
      knee: [112, 165],
      hip: [168, 142],
      shoulder: [246, 114],
      head: [288, 108],
      elbow: [232, 150],
      wrist: [218, 190],
      backArmElbow: [222, 150],
      backArmWrist: [208, 188],
    },
    bottom: {
      ankle: [54, 184],
      knee: [114, 174],
      hip: [172, 162],
      shoulder: [252, 152],
      head: [294, 148],
      elbow: [198, 148],
      wrist: [218, 190],
      backArmElbow: [190, 150],
      backArmWrist: [208, 188],
    },
  },
  // 3. Tricep — Diamond Close-Grip Push-Up (rigid plank, hands centered directly under chest, tight elbow tuck)
  tricep: {
    top: {
      ankle: [52, 186],
      knee: [112, 165],
      hip: [172, 142],
      shoulder: [242, 114],
      head: [282, 106],
      elbow: [238, 152],
      wrist: [236, 190],
      backArmElbow: [232, 152],
      backArmWrist: [232, 190],
    },
    bottom: {
      ankle: [52, 186],
      knee: [114, 176],
      hip: [174, 166],
      shoulder: [244, 158],
      head: [284, 154],
      elbow: [198, 156],
      wrist: [236, 190],
      backArmElbow: [194, 156],
      backArmWrist: [232, 190],
    },
  },
  // 4. Wings — Wide-Grip Lat-Stretch Push-Up (wide hand placement, deep chest drop & scapular protraction)
  wings: {
    top: {
      ankle: [50, 186],
      knee: [110, 162],
      hip: [170, 138],
      shoulder: [238, 108],
      head: [280, 102],
      elbow: [250, 148],
      wrist: [262, 190],
      backArmElbow: [222, 146],
      backArmWrist: [218, 186],
    },
    bottom: {
      ankle: [50, 186],
      knee: [112, 178],
      hip: [174, 170],
      shoulder: [242, 166],
      head: [286, 164],
      elbow: [268, 142],
      wrist: [262, 190],
      backArmElbow: [204, 142],
      backArmWrist: [218, 186],
    },
  },
};

export const PushUpAnimation: React.FC<PushUpAnimationProps> = ({
  type,
  autoPlay = true,
  speed = 1,
  manualProgress = null,
  repTrigger = 0,
  compact = false,
  className = '',
}) => {
  const [depth, setDepth] = useState(0); // 0 = top plank, 1 = bottom contraction
  const [phaseLabel, setPhaseLabel] = useState<'Top Lockout' | 'Lowering' | 'Peak Tension' | 'Push Up'>('Top Lockout');
  const prevTriggerRef = useRef(repTrigger);
  const pulseStartRef = useRef<number | null>(null);
  const loopPhaseRef = useRef(0);

  // Trigger a single smooth push-up cycle when repTrigger increments
  useEffect(() => {
    if (repTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = repTrigger;
      pulseStartRef.current = performance.now();
    }
  }, [repTrigger]);

  useEffect(() => {
    if (manualProgress !== null) {
      const clamped = Math.max(0, Math.min(1, manualProgress));
      setDepth(clamped);
      if (clamped < 0.15) setPhaseLabel('Top Lockout');
      else if (clamped > 0.85) setPhaseLabel('Peak Tension');
      else setPhaseLabel('Lowering');
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      if (pulseStartRef.current !== null) {
        const elapsed = now - pulseStartRef.current;
        const duration = 680; // snappy single rep animation
        if (elapsed >= duration) {
          pulseStartRef.current = null;
          setDepth(0);
          setPhaseLabel('Top Lockout');
        } else {
          const p = elapsed / duration;
          const eased = Math.sin(p * Math.PI);
          setDepth(eased);
          if (p < 0.42) setPhaseLabel('Lowering');
          else if (p < 0.58) setPhaseLabel('Peak Tension');
          else setPhaseLabel('Push Up');
        }
      } else if (autoPlay) {
        // Continuous smooth cycle (~2.2s per rep at 1x speed)
        const angularVelocity = (Math.PI * 2 * speed) / 2200;
        loopPhaseRef.current = (loopPhaseRef.current + dt * angularVelocity) % (Math.PI * 2);
        const theta = loopPhaseRef.current;
        // 0 at top, 1 at bottom with slight pause at top & bottom
        const raw = (1 - Math.cos(theta)) / 2;
        const eased = raw * raw * (3 - 2 * raw);
        setDepth(eased);

        if (eased < 0.12) setPhaseLabel('Top Lockout');
        else if (eased > 0.88) setPhaseLabel('Peak Tension');
        else if (theta < Math.PI) setPhaseLabel('Lowering');
        else setPhaseLabel('Push Up');
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [autoPlay, speed, manualProgress]);

  const meta = PUSH_UP_VARIATIONS[type];
  const poses = VARIATION_POSES[type];
  const pose = lerpPose(poses.top, poses.bottom, depth);

  // Derived anatomical muscle highlight anchor points
  const upperArmMid: [number, number] = [
    (pose.shoulder[0] + pose.elbow[0]) / 2,
    (pose.shoulder[1] + pose.elbow[1]) / 2,
  ];
  const latMid: [number, number] = [
    lerp(pose.shoulder[0], pose.hip[0], 0.38),
    lerp(pose.shoulder[1], pose.hip[1], 0.38) + 6,
  ];
  const muscleIntensity = 0.32 + depth * 0.62;

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="0 0 360 225"
        className="w-full h-auto block overflow-visible"
        role="img"
        aria-label={`${meta.label} push-up animation (${meta.variationName})`}
      >
        <defs>
          {/* Active muscle glow gradient */}
          <radialGradient id={`muscleGlow-${type}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={meta.accentColor} stopOpacity="0.95" />
            <stop offset="55%" stopColor={meta.accentColor} stopOpacity="0.45" />
            <stop offset="100%" stopColor={meta.accentColor} stopOpacity="0" />
          </radialGradient>

          {/* Pushr floor sensor beam matching screenshot app icon */}
          <linearGradient id={`sensorBeam-${type}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={meta.accentColor} stopOpacity="0" />
            <stop offset="100%" stopColor={meta.accentColor} stopOpacity={0.12 + depth * 0.22} />
          </linearGradient>

          <linearGradient id="floorFade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="20%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="80%" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Studio Floor Plane */}
        <line
          x1="24"
          y1="194"
          x2="336"
          y2="194"
          stroke="url(#floorFade)"
          strokeWidth="1.5"
          className="text-black dark:text-white"
        />

        {/* Floor Phone / Sensor Pad inspired by Pushr App Icon */}
        <g>
          <polygon
            points={`${pose.head[0] - 20},192 ${pose.head[0] + 20},192 ${pose.head[0] + 32},${pose.head[1] + 12} ${pose.head[0] - 32},${pose.head[1] + 12}`}
            fill={`url(#sensorBeam-${type})`}
          />
          <rect
            x={pose.head[0] - 18}
            y="191.5"
            width="36"
            height="3.5"
            rx="1.75"
            className="fill-[#1C1C1E] dark:fill-[#E5E5EA]"
          />
        </g>

        {/* Soft Floor Contact Shadow */}
        <ellipse
          cx="175"
          cy="195"
          rx={106 + depth * 12}
          ry={4.5 + depth * 2}
          className="fill-black/[0.08] dark:fill-black/50"
        />

        {/* Hand stance indicator markers on floor */}
        {type === 'tricep' && (
          <g opacity="0.6">
            <polygon
              points="236,198 242,202 236,206 230,202"
              fill={meta.accentColor}
            />
          </g>
        )}
        {type === 'wings' && (
          <g opacity="0.65">
            <line x1="216" y1="201" x2="264" y2="201" stroke={meta.accentColor} strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="216" cy="201" r="2.5" fill={meta.accentColor} />
            <circle cx="264" cy="201" r="2.5" fill={meta.accentColor} />
          </g>
        )}
        {type === 'bicep' && (
          <g opacity="0.65">
            <path
              d="M 222 203 L 208 203 M 208 203 L 213 199 M 208 203 L 213 207"
              stroke={meta.accentColor}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}

        {/* Back Arm (subtle depth layer) */}
        <g
          className="stroke-[#98989F] dark:stroke-[#52525B]"
          strokeWidth="12"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d={`M ${pose.shoulder[0]} ${pose.shoulder[1]} L ${pose.backArmElbow[0]} ${pose.backArmElbow[1]} L ${pose.backArmWrist[0]} ${pose.backArmWrist[1]}`} />
        </g>

        {/* Sculpted Legs & Torso Silhouette */}
        <g
          className="stroke-[#3A3A40] dark:stroke-[#D4D4D8]"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Calf */}
          <line
            x1={pose.ankle[0]}
            y1={pose.ankle[1]}
            x2={pose.knee[0]}
            y2={pose.knee[1]}
            strokeWidth="13"
          />
          {/* Foot / Toe anchor */}
          <line
            x1={pose.ankle[0]}
            y1={pose.ankle[1]}
            x2={pose.ankle[0] - 8}
            y2={192}
            strokeWidth="10"
          />
          {/* Thigh */}
          <line
            x1={pose.knee[0]}
            y1={pose.knee[1]}
            x2={pose.hip[0]}
            y2={pose.hip[1]}
            strokeWidth="16"
          />
          {/* Torso */}
          <line
            x1={pose.hip[0]}
            y1={pose.hip[1]}
            x2={pose.shoulder[0]}
            y2={pose.shoulder[1]}
            strokeWidth="22"
          />
        </g>

        {/* Wings (Latissimus Dorsi) anatomical highlight on torso */}
        {type === 'wings' && (
          <g>
            <ellipse
              cx={latMid[0]}
              cy={latMid[1]}
              rx={28 + depth * 6}
              ry={14 + depth * 4}
              transform={`rotate(${Math.atan2(pose.shoulder[1] - pose.hip[1], pose.shoulder[0] - pose.hip[0]) * (180 / Math.PI)}, ${latMid[0]}, ${latMid[1]})`}
              fill={`url(#muscleGlow-${type})`}
              opacity={muscleIntensity}
            />
            <path
              d={`M ${pose.shoulder[0] - 8} ${pose.shoulder[1] + 5} Q ${latMid[0] - 4} ${latMid[1] + 10} ${pose.hip[0] + 16} ${pose.hip[1] + 4}`}
              stroke={meta.accentColor}
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
              opacity={0.55 + depth * 0.45}
            />
          </g>
        )}

        {/* Head */}
        <circle
          cx={pose.head[0]}
          cy={pose.head[1]}
          r="15"
          className="fill-[#1C1C1E] dark:fill-[#F4F4F5]"
        />

        {/* Front Arm (foreground primary limb) */}
        <g
          className="stroke-[#1C1C1E] dark:stroke-[#F4F4F5]"
          strokeWidth="13.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          {/* Upper arm */}
          <line
            x1={pose.shoulder[0]}
            y1={pose.shoulder[1]}
            x2={pose.elbow[0]}
            y2={pose.elbow[1]}
          />
          {/* Forearm */}
          <line
            x1={pose.elbow[0]}
            y1={pose.elbow[1]}
            x2={pose.wrist[0]}
            y2={pose.wrist[1]}
            strokeWidth="11.5"
          />
          {/* Palm on floor */}
          <line
            x1={pose.wrist[0] - (type === 'bicep' ? 11 : 3)}
            y1={191}
            x2={pose.wrist[0] + (type === 'bicep' ? 3 : 11)}
            y2={191}
            strokeWidth="7"
          />
        </g>

        {/* Target Muscle Anatomical Glow Overlays */}
        {type === 'shoulder' && (
          <g>
            <circle
              cx={pose.shoulder[0]}
              cy={pose.shoulder[1]}
              r={22 + depth * 6}
              fill={`url(#muscleGlow-${type})`}
              opacity={muscleIntensity}
            />
            <circle
              cx={pose.shoulder[0]}
              cy={pose.shoulder[1]}
              r="7"
              fill={meta.accentColor}
              opacity={0.75 + depth * 0.25}
            />
          </g>
        )}

        {type === 'bicep' && (
          <g>
            <circle
              cx={upperArmMid[0] + 4}
              cy={upperArmMid[1] + 2}
              r={20 + depth * 5}
              fill={`url(#muscleGlow-${type})`}
              opacity={muscleIntensity}
            />
            <line
              x1={lerp(pose.shoulder[0], pose.elbow[0], 0.25) + 3}
              y1={lerp(pose.shoulder[1], pose.elbow[1], 0.25) + 2}
              x2={lerp(pose.shoulder[0], pose.elbow[0], 0.78) + 3}
              y2={lerp(pose.shoulder[1], pose.elbow[1], 0.78) + 2}
              stroke={meta.accentColor}
              strokeWidth="5.5"
              strokeLinecap="round"
              opacity={0.7 + depth * 0.3}
            />
          </g>
        )}

        {type === 'tricep' && (
          <g>
            <circle
              cx={upperArmMid[0] - 4}
              cy={upperArmMid[1] - 2}
              r={20 + depth * 5}
              fill={`url(#muscleGlow-${type})`}
              opacity={muscleIntensity}
            />
            <line
              x1={lerp(pose.shoulder[0], pose.elbow[0], 0.22) - 4}
              y1={lerp(pose.shoulder[1], pose.elbow[1], 0.22) - 2}
              x2={lerp(pose.shoulder[0], pose.elbow[0], 0.8) - 4}
              y2={lerp(pose.shoulder[1], pose.elbow[1], 0.8) - 2}
              stroke={meta.accentColor}
              strokeWidth="5.5"
              strokeLinecap="round"
              opacity={0.7 + depth * 0.3}
            />
          </g>
        )}

        {/* Depth / Motion Guide Arc */}
        {!compact && (
          <g opacity="0.45">
            <line
              x1="322"
              y1="106"
              x2="322"
              y2="178"
              className="stroke-black/25 dark:stroke-white/25"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle
              cx="322"
              cy={106 + depth * 72}
              r="4"
              fill={meta.accentColor}
            />
          </g>
        )}
      </svg>

      {!compact && (
        <div className="mt-1 flex items-center justify-between text-xs text-[#6E6E73] dark:text-[#9898A0]">
          <span>
            Active Target: <strong className="font-semibold text-[#0A0A0C] dark:text-white">{meta.targetMuscles}</strong>
          </span>
          <span className="font-sf-mono tabular-nums">{phaseLabel}</span>
        </div>
      )}
    </div>
  );
};
