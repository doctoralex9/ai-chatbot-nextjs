'use client';

// ── Robot Preview — development-only page ─────────────────────────────────────
//
// Navigate to /robot-preview to see the robot isolated from the app layout.
// This makes it easy to iterate on geometry, lights and camera without
// deploying the whole app or fighting the 3-column grid.
//
// NOT linked from navigation — it's a dev tool only.

import { useRef } from 'react';
import RobotStage, { type RobotStageHandle } from '@/components/RobotStage';

export default function RobotPreview() {
  const robotRef = useRef<RobotStageHandle | null>(null);

  return (
    <div
      style={{
        width:           '100vw',
        height:          '100dvh',
        background:      '#000000',
        display:         'flex',
        flexDirection:   'column',
        overflow:        'hidden',
        position:        'relative',
      }}
    >
      {/* ── Robot fills the full viewport ── */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <RobotStage ref={robotRef} />
      </div>

      {/* ── Dev controls strip at the bottom ── */}
      <div
        style={{
          flexShrink:      0,
          height:          '52px',
          background:      'rgba(10,10,10,0.95)',
          borderTop:       '1px solid rgba(255,255,255,0.08)',
          display:         'flex',
          alignItems:      'center',
          gap:             '12px',
          padding:         '0 20px',
          fontFamily:      'monospace',
          fontSize:        '11px',
          color:           'rgba(255,255,255,0.5)',
          letterSpacing:   '0.06em',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>ROBOT PREVIEW</span>

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)' }} />

        {/* Idle pose button */}
        <button
          onClick={() => robotRef.current?.setIdle()}
          style={btnStyle}
        >
          IDLE (profile)
        </button>

        {/* Active / face-camera pose button */}
        <button
          onClick={() => robotRef.current?.setActive()}
          style={btnStyle}
        >
          SESSION (front)
        </button>

        <div style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.2)' }}>
          /robot-preview — dev only
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background:    'rgba(255,255,255,0.06)',
  border:        '1px solid rgba(255,255,255,0.12)',
  borderRadius:  '4px',
  color:         'rgba(255,255,255,0.7)',
  cursor:        'pointer',
  fontFamily:    'monospace',
  fontSize:      '10px',
  letterSpacing: '0.08em',
  padding:       '5px 12px',
};
