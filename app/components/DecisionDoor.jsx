'use client';

import React, { useState } from 'react';

export default function DecisionDoor({ reviewResult, onStepChange, decisionText, verdictLine, hingeScore }) {
  const [current, setCurrent] = useState(-1);

  // Get score color matching the main results page
  const getScoreMeta = (label) => {
    if (label === 'Needs more before you commit')
      return { color: '#A32D2D' };
    if (label === 'Take a smaller step')
      return { color: '#854F0B' };
    if (label === 'Proceed with caution')
      return { color: '#5C4B00' };
    return { color: '#0F6E56' };
  };

  const meta = getScoreMeta(reviewResult?.readiness?.label);

  // Map reviewResult to steps data
  const steps = [
    {
      id: 'door',
      label: `The door · clarity ${reviewResult.readiness.clarity}/20`,
      heading: reviewResult.snapshot.door,
      body: reviewResult.readiness.rationale?.clarity || '',
      nextIndex: 1,
      nextLabel: 'The hinges →',
    },
    {
      id: 'hinge',
      label: `The hinges · assumptions ${reviewResult.readiness.assumptions}/20`,
      heading: reviewResult.snapshot.hinge,
      body: reviewResult.readiness.rationale?.assumptions || '',
      nextIndex: 2,
      nextLabel: 'The lock →',
    },
    {
      id: 'lock',
      label: `The lock · reversibility ${reviewResult.readiness.reversibility}/20`,
      heading: reviewResult.snapshot.lock,
      body: reviewResult.readiness.rationale?.reversibility || '',
      nextIndex: 3,
      nextLabel: 'The exit sign →',
    },
    {
      id: 'exit',
      label: `The exit sign · exit logic ${reviewResult.readiness.exitLogic}/20`,
      heading: reviewResult.snapshot.exit,
      body: reviewResult.readiness.rationale?.exitLogic || '',
      nextIndex: 4,
      nextLabel: 'The trap →',
    },
    {
      id: 'trap',
      label: `The trap · risk ${reviewResult.readiness.risk}/20`,
      heading: reviewResult.snapshot.trap,
      body: reviewResult.readiness.rationale?.risk || '',
      nextIndex: 5,
      nextLabel: 'See next step →',
    },
    {
      id: 'step',
      label: 'The step · your next action',
      heading: reviewResult.snapshot.step,
      body: reviewResult.snapshot.script || '',
      nextIndex: null,
      nextLabel: null,
    },
  ];

  const showStep = (index) => {
    setCurrent(index);
    if (onStepChange) onStepChange(index);
  };

  const replay = () => {
    setCurrent(-1);
    if (onStepChange) onStepChange(-1);
  };

  // Determine door type based on PAIRES scores
  const getDoorType = () => {
    // High-stakes override: force steel door for low-scoring, high-risk decisions
    const totalScore = reviewResult.readiness.total;
    const riskScore = reviewResult.readiness.risk;
    if (totalScore < 70 && riskScore > 8) {
      return {
        type: 'steel door',
        pillBg: '#444441',
        pillColor: '#F1EFE8',
        panelColor: '#C8C6BC',
        pulseColor: '#E24B4A',
      };
    }

    const clarity = reviewResult.readiness.clarity;
    const assumptions = reviewResult.readiness.assumptions;
    const reversibility = reviewResult.readiness.reversibility;
    const exitLogic = reviewResult.readiness.exitLogic;

    // Glass door: clarity ≤ 8 AND assumptions ≤ 8
    if (clarity <= 8 && assumptions <= 8) {
      return {
        type: 'glass door',
        pillBg: '#0C447C',
        pillColor: '#E6F1FB',
        panelColor: '#D8D6CE',
        pulseColor: '#0C447C',
      };
    }

    // Revolving door: reversibility ≥ 14 AND exit logic ≥ 12
    if (reversibility >= 14 && exitLogic >= 12) {
      return {
        type: 'revolving door',
        pillBg: '#3C3489',
        pillColor: '#EEEDFE',
        panelColor: '#C8C6BC',
        pulseColor: '#3C3489',
      };
    }

    // Screen door: clarity ≤ 5
    if (clarity <= 5) {
      return {
        type: 'screen door',
        pillBg: '#633806',
        pillColor: '#FAEEDA',
        panelColor: '#D2C8B8',
        pulseColor: '#633806',
      };
    }

    // Unlocked door: reversibility ≤ 6
    if (reversibility <= 6) {
      return {
        type: 'unlocked door',
        pillBg: '#712B13',
        pillColor: '#FAECE7',
        panelColor: '#C8C0B8',
        pulseColor: '#712B13',
      };
    }

    // Cleared door: clarity ≥ 14 AND reversibility ≥ 12 AND exit logic ≥ 10 AND overall score ≥ 65
    if (clarity >= 14 && reversibility >= 12 && exitLogic >= 10 && totalScore >= 65) {
      return {
        type: 'cleared door',
        pillBg: '#27500A',
        pillColor: '#EAF3DE',
        panelColor: '#C0C4B6',
        pulseColor: '#27500A',
      };
    }

    // Steel door: default
    return {
      type: 'steel door',
      pillBg: '#444441',
      pillColor: '#F1EFE8',
      panelColor: '#C8C6BC',
      pulseColor: '#E24B4A',
    };
  };

  const doorType = getDoorType();

  // Calculate crack opacity based on hinge score
  const getCrackOpacity = () => {
    if (hingeScore <= 8) {
      return { count: 3, opacity: 1, animated: true };
    } else if (hingeScore >= 9 && hingeScore <= 13) {
      return { count: 2, opacity: 0.6, animated: false };
    } else {
      return { count: 0, opacity: 0, animated: false };
    }
  };

  const crackStyle = getCrackOpacity();

  // Sequential unlock system - determine which elements are active/dimmed
  const getElementOpacity = (elementName) => {
    // Initial state: only door is bright
    if (current < 0) {
      return elementName === 'door' ? 1 : 0.4;
    }
    // Show the current element bright
    const brightElements = {
      0: 'door',      // Viewing door
      1: 'hinges',    // Viewing hinges
      2: 'lock',      // Viewing lock
      3: 'exit',      // Viewing exit
      4: 'trap',      // Viewing trap
      5: 'all'      // After threshold tapped (final state)
    };

    const bright = brightElements[current];
    if (bright === 'all') return 1;
    if (bright === elementName) return 1.2; // 120% brightness for active element
    return 0.5; // Everything else dimmed
  };

  const isZoneEnabled = (zoneIndex) => {
    // Only allow tapping the next zone in sequence
    return current === zoneIndex - 1;
  };

  return (
    <div style={{ width: '100%', maxWidth: '560px', margin: '0 auto' }}>
      <style jsx>{`
        .dd-wrap {
          background: #181614;
          border: 0.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          overflow: hidden;
        }
        .dd-dots-row {
          display: flex;
          gap: 10px;
          justify-content: center;
          padding: 10px 0 6px;
          background: #181614;
        }
        .dd-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #666462;
          transition: background 0.3s, transform 0.3s;
          cursor: pointer;
        }
        .dd-dot:hover:not(.active) {
          background: #999795;
        }
        .dd-dot.active {
          background: #FFFFFF;
          transform: scale(1.3);
        }
        .dd-dot.done {
          background: #666462;
        }
        .dd-reveal {
          padding: 20px 20px 28px;
          border-top: 0.5px solid rgba(255, 255, 255, 0.08);
          display: none;
          background: #181614;
        }
        .dd-reveal.show {
          display: block;
          animation: slideIn 0.3s ease forwards;
        }
        .dd-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #888780;
          margin-bottom: 6px;
        }
        .dd-heading {
          font-size: 15px;
          font-weight: 500;
          color: #F1EFE8;
          line-height: 1.4;
          margin-bottom: 14px;
        }
        .dd-body {
          font-size: 13px;
          color: #D3D1C7;
          line-height: 1.65;
          margin-bottom: 14px;
          font-weight: 400;
        }
        .dd-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .dd-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          color: #F1EFE8;
          background: rgba(255, 255, 255, 0.08);
          border: 0.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 7px 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .dd-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .dd-replay-row {
          display: none;
          justify-content: center;
          padding: 4px 0 8px;
          background: #181614;
        }
        .dd-replay-row.show {
          display: flex;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes tapPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes ringExpand {
          0% { r: 22; opacity: 0.5; }
          100% { r: 38; opacity: 0; }
        }
        @keyframes crackP {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
        @keyframes exitFlicker {
          0%, 100% { opacity: 0.1; }
          40% { opacity: 0.25; }
          60% { opacity: 0.08; }
        }
        @keyframes hlPulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes buttonExpand {
          0% { r: 40; opacity: 0.3; }
          100% { r: 70; opacity: 0; }
        }
        @keyframes guideDotPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes nextButtonPulse {
          0%, 100% {
            transform: scale(1);
            background: #2A2A28;
          }
          50% {
            transform: scale(1.04);
            background: #383836;
          }
        }
        @keyframes beginBarPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes completionPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .dd-pulse-circle {
          animation: tapPulse 2s ease-in-out infinite;
          transform-origin: center;
        }
        .dd-pulse-text {
          animation: tapPulse 2s ease-in-out infinite;
          transform-origin: center;
        }
        .crack-animate {
          animation: crackP 2.8s ease-in-out infinite;
        }
        .dd-btn-next-pulse {
          animation: nextButtonPulse 1.5s ease-in-out infinite;
        }
      `}</style>

      <div className="dd-wrap">
        <svg width="100%" viewBox="0 0 680 560" role="img" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#0E0D0C"/>
              <stop offset="35%" stopColor="#1A1816"/>
              <stop offset="65%" stopColor="#1A1816"/>
              <stop offset="100%" stopColor="#0E0D0C"/>
            </linearGradient>
            <linearGradient id="wallV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#141210" stopOpacity="0.8"/>
              <stop offset="40%" stopColor="#1C1A18" stopOpacity="0"/>
              <stop offset="100%" stopColor="#0A0908" stopOpacity="0.6"/>
            </linearGradient>
            <linearGradient id="floorG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A2826"/>
              <stop offset="100%" stopColor="#1A1816"/>
            </linearGradient>
            <linearGradient id="frameG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E1C1A"/>
              <stop offset="20%" stopColor="#3A3836"/>
              <stop offset="50%" stopColor="#484644"/>
              <stop offset="80%" stopColor="#3A3836"/>
              <stop offset="100%" stopColor="#1E1C1A"/>
            </linearGradient>
            <linearGradient id="panelG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8A8880"/>
              <stop offset="25%" stopColor="#B8B6AE"/>
              <stop offset="50%" stopColor="#C8C6BE"/>
              <stop offset="75%" stopColor="#B4B2AA"/>
              <stop offset="100%" stopColor="#8A8880"/>
            </linearGradient>
            <linearGradient id="panelV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D8D6CE" stopOpacity="0.3"/>
              <stop offset="50%" stopColor="#C0BEB6" stopOpacity="0"/>
              <stop offset="100%" stopColor="#888680" stopOpacity="0.2"/>
            </linearGradient>
            <linearGradient id="brassG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#D4A840"/>
              <stop offset="35%" stopColor="#F0CC60"/>
              <stop offset="65%" stopColor="#E0B848"/>
              <stop offset="100%" stopColor="#A87E20"/>
            </linearGradient>
            <linearGradient id="hingeG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6A6860"/>
              <stop offset="40%" stopColor="#C8C6BE"/>
              <stop offset="100%" stopColor="#5A5850"/>
            </linearGradient>
            <linearGradient id="lightG" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#F5E8C0" stopOpacity="0.18"/>
              <stop offset="100%" stopColor="#F5E8C0" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="threshG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A87E20"/>
              <stop offset="30%" stopColor="#F0CC60"/>
              <stop offset="70%" stopColor="#E8C050"/>
              <stop offset="100%" stopColor="#A07818"/>
            </linearGradient>
            <linearGradient id="ghostG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D9E75" stopOpacity="0.05"/>
              <stop offset="100%" stopColor="#1D9E75" stopOpacity="0.01"/>
            </linearGradient>
            <clipPath id="panelClip">
              <rect x="198" y="62" width="254" height="440"/>
            </clipPath>
            <pattern id="stonePat" x="0" y="0" width="60" height="30" patternUnits="userSpaceOnUse">
              <rect width="60" height="30" fill="#1A1816"/>
              <rect width="60" height="15" fill="#1C1A18"/>
              <line x1="0" y1="0" x2="60" y2="0" stroke="#0E0D0C" strokeWidth="1"/>
              <line x1="0" y1="15" x2="60" y2="15" stroke="#0E0D0C" strokeWidth="0.5"/>
              <line x1="30" y1="0" x2="30" y2="15" stroke="#0E0D0C" strokeWidth="0.5"/>
            </pattern>
            <pattern id="floorPat" x="0" y="0" width="48" height="24" patternUnits="userSpaceOnUse">
              <rect width="48" height="24" fill="#222220"/>
              <rect width="24" height="24" fill="#262422"/>
              <line x1="0" y1="0" x2="48" y2="0" stroke="#181614" strokeWidth="1"/>
              <line x1="24" y1="0" x2="24" y2="24" stroke="#181614" strokeWidth="0.5"/>
            </pattern>
            {/* Progressive state glow filters */}
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* WALL — stone texture */}
          <rect x="0" y="0" width="680" height="560" fill="url(#stonePat)"/>
          <rect x="0" y="0" width="680" height="560" fill="url(#wallL)"/>
          <rect x="0" y="0" width="680" height="560" fill="url(#wallV)"/>

          {/* FLOOR */}
          <rect x="0" y="502" width="680" height="58" fill="url(#floorPat)"/>
          <line x1="0" y1="502" x2="680" y2="502" stroke="#2A2826" strokeWidth="1.5"/>
          <line x1="0" y1="503" x2="680" y2="503" stroke="#0E0D0C" strokeWidth="0.5"/>

          {/* OVERHEAD LIGHT — warm cone from above */}
          <ellipse cx="340" cy="58" rx="180" ry="24" fill="url(#lightG)"/>
          <line x1="270" y1="40" x2="198" y2="502" stroke="#F5E8C0" strokeWidth="0.3" opacity="0.04"/>
          <line x1="410" y1="40" x2="452" y2="502" stroke="#F5E8C0" strokeWidth="0.3" opacity="0.04"/>

          {/* GHOST IDEAL DOOR — faint green outline behind */}
          <rect x="198" y="62" width="254" height="440" rx="2" fill="url(#ghostG)" stroke="#1D9E75" strokeWidth="0.8" strokeDasharray="6 4" opacity="0.2"/>
          {/* ghost hinges */}
          <rect x="190" y="108" width="10" height="28" rx="1" fill="#1D9E75" opacity="0.1"/>
          <rect x="190" y="354" width="10" height="28" rx="1" fill="#1D9E75" opacity="0.1"/>
          {/* ghost exit lit */}
          <rect x="265" y="30" width="110" height="20" rx="3" fill="#1D9E75" opacity="0.08"/>

          {/* DOOR FRAME — heavy cast iron */}
          <rect x="188" y="54" width="274" height="456" rx="3" fill="url(#frameG)"/>
          {/* outer bevel dark */}
          <rect x="188" y="54" width="274" height="456" rx="3" fill="none" stroke="#0E0D0C" strokeWidth="2"/>
          {/* inner bevel light */}
          <rect x="192" y="58" width="266" height="448" rx="2" fill="none" stroke="#484644" strokeWidth="0.8" opacity="0.6"/>
          {/* frame depth lines */}
          <line x1="192" y1="58" x2="192" y2="506" stroke="#3A3836" strokeWidth="0.5" opacity="0.8"/>
          <line x1="458" y1="58" x2="458" y2="506" stroke="#3A3836" strokeWidth="0.5" opacity="0.8"/>

          {/* SIDE REVEAL — door ajar, glimpse beyond */}
          <rect x="450" y="62" width="10" height="440" fill="#0A0908"/>
          <rect x="452" y="62" width="6" height="440" fill="#0E0D0C" opacity="0.6"/>

          {/* DOOR PANEL */}
          <g clipPath="url(#panelClip)">
            <rect x="198" y="62" width="252" height="440" fill="url(#panelG)"/>
            <rect x="198" y="62" width="252" height="440" fill="url(#panelV)"/>
          </g>
          {/* panel edge shadow left */}
          <rect x="198" y="62" width="5" height="440" fill="#6A6860" opacity="0.3"/>
          {/* panel edge highlight right */}
          <rect x="445" y="62" width="5" height="440" fill="#D8D6CE" opacity="0.15"/>
          {/* panel border */}
          <rect x="198" y="62" width="252" height="440" rx="1" fill="none" stroke="#6A6860" strokeWidth="0.5" opacity="0.5"/>

          {/* PANEL INSETS — raised with shadow/highlight */}
          {/* top inset shadow */}
          <rect x="214" y="78" width="220" height="148" rx="2" fill="#6A6860" opacity="0.2"/>
          {/* top inset surface */}
          <rect x="215" y="79" width="218" height="146" rx="1" fill="#C8C6BE" opacity="0.5"/>
          <rect x="215" y="79" width="218" height="1" fill="#D8D6CE" opacity="0.6"/>
          <rect x="215" y="79" width="1" height="146" fill="#D8D6CE" opacity="0.4"/>
          <rect x="215" y="79" width="218" height="146" rx="1" fill="none" stroke="#8A8880" strokeWidth="0.5" opacity="0.4"/>

          {/* bottom inset shadow */}
          <rect x="214" y="242" width="220" height="244" rx="2" fill="#6A6860" opacity="0.18"/>
          {/* bottom inset surface */}
          <rect x="215" y="243" width="218" height="242" rx="1" fill="#C8C6BE" opacity="0.45"/>
          <rect x="215" y="243" width="218" height="1" fill="#D8D6CE" opacity="0.5"/>
          <rect x="215" y="243" width="1" height="242" fill="#D8D6CE" opacity="0.35"/>
          <rect x="215" y="243" width="218" height="242" rx="1" fill="none" stroke="#8A8880" strokeWidth="0.5" opacity="0.35"/>

          {/* HINGES — large brass, prominent */}
          <g opacity={getElementOpacity('hinges')}>
          {/* Top hinge - warm gold glow after layer 0, 600ms ease in */}
          <g
            filter={current >= 0 ? 'url(#goldGlow)' : undefined}
            style={{ transition: 'filter 600ms ease-in' }}
          >
          {current >= 0 && (
            <rect x="184" y="104" width="28" height="44" fill="#B8860B" opacity="0.3" rx="2"/>
          )}
          {/* Top hinge wall plate */}
          <rect x="184" y="104" width="18" height="44" rx="2" fill="url(#hingeG)"/>
          <rect x="184" y="104" width="18" height="44" rx="2" fill="none" stroke="#4A4840" strokeWidth="0.5"/>
          {/* Top hinge door plate — brass */}
          <rect x="198" y="108" width="14" height="36" rx="1" fill="url(#brassG)"/>
          <rect x="198" y="108" width="14" height="36" rx="1" fill="none" stroke="#9A7218" strokeWidth="0.5"/>
          {/* Top hinge pin */}
          <ellipse cx="205" cy="126" rx="3.5" ry="3.5" fill="#D4A840"/>
          <line x1="205" y1="108" x2="205" y2="144" stroke="#A87820" strokeWidth="1.5"/>
          {/* Top hinge screws */}
          <circle cx="205" cy="114" r="1.5" fill="#8A6818"/>
          <circle cx="205" cy="138" r="1.5" fill="#8A6818"/>
          </g>
          {/* crack lines top */}
          <line
            x1="184" y1="114" x2="212" y2="119"
            stroke="#E24B4A"
            strokeWidth="0.9"
            opacity={current === 1 || (crackStyle.count >= 1 && crackStyle.opacity > 0) ? crackStyle.opacity : 0}
            className={crackStyle.animated ? 'crack-animate' : ''}
            style={{ transition: 'opacity 0.5s' }}
          />
          <line
            x1="184" y1="130" x2="212" y2="135"
            stroke="#E24B4A"
            strokeWidth="0.6"
            opacity={current === 1 || (crackStyle.count >= 2 && crackStyle.opacity > 0) ? crackStyle.opacity : 0}
            className={crackStyle.animated ? 'crack-animate' : ''}
            style={{ transition: 'opacity 0.5s' }}
          />
          <line
            x1="203" y1="104" x2="200" y2="148"
            stroke="#E24B4A"
            strokeWidth="0.5"
            strokeDasharray="2 2"
            opacity={current === 1 || (crackStyle.count >= 3 && crackStyle.opacity > 0) ? crackStyle.opacity : 0}
            className={crackStyle.animated ? 'crack-animate' : ''}
            style={{ transition: 'opacity 0.5s' }}
          />
          {/* hinge hl top */}
          <rect x="178" y="96" width="36" height="60" rx="4" fill="none" stroke="#E24B4A" strokeWidth={current === 1 ? 2 : 0} opacity={current === 1 ? 0.9 : 0} style={{ transition: 'all 0.25s' }}/>

          {/* Bottom hinge - warm gold glow after layer 1, 600ms ease in with slight delay */}
          <g
            filter={current >= 1 ? 'url(#goldGlow)' : undefined}
            style={{ transition: 'filter 600ms 100ms ease-in' }}
          >
          {current >= 1 && (
            <rect x="184" y="352" width="28" height="44" fill="#B8860B" opacity="0.3" rx="2"/>
          )}
          <rect x="184" y="352" width="18" height="44" rx="2" fill="url(#hingeG)"/>
          <rect x="184" y="352" width="18" height="44" rx="2" fill="none" stroke="#4A4840" strokeWidth="0.5"/>
          <rect x="198" y="356" width="14" height="36" rx="1" fill="url(#brassG)"/>
          <rect x="198" y="356" width="14" height="36" rx="1" fill="none" stroke="#9A7218" strokeWidth="0.5"/>
          <ellipse cx="205" cy="374" rx="3.5" ry="3.5" fill="#D4A840"/>
          <line x1="205" y1="356" x2="205" y2="392" stroke="#A87820" strokeWidth="1.5"/>
          <circle cx="205" cy="362" r="1.5" fill="#8A6818"/>
          <circle cx="205" cy="386" r="1.5" fill="#8A6818"/>
          </g>
          {/* crack lines bottom */}
          <line
            x1="184" y1="362" x2="212" y2="367"
            stroke="#E24B4A"
            strokeWidth="0.8"
            opacity={current === 1 || (crackStyle.count >= 1 && crackStyle.opacity > 0) ? crackStyle.opacity : 0}
            className={crackStyle.animated ? 'crack-animate' : ''}
            style={{ transition: 'opacity 0.5s' }}
          />
          <line
            x1="184" y1="380" x2="212" y2="385"
            stroke="#E24B4A"
            strokeWidth="0.55"
            opacity={current === 1 || (crackStyle.count >= 2 && crackStyle.opacity > 0) ? crackStyle.opacity : 0}
            className={crackStyle.animated ? 'crack-animate' : ''}
            style={{ transition: 'opacity 0.5s' }}
          />
          {/* hinge hl bot */}
          <rect x="178" y="344" width="36" height="60" rx="4" fill="none" stroke="#E24B4A" strokeWidth={current === 1 ? 2 : 0} opacity={current === 1 ? 0.75 : 0} style={{ transition: 'all 0.25s' }}/>
          </g>

          {/* LOCK — large brass escutcheon */}
          <g opacity={getElementOpacity('lock')}>
          {/* Slow breathing glow at start - invitation that ends once accepted */}
          <circle
            cx="463"
            cy="285"
            r="20"
            fill="#B8860B"
            opacity={current < 0 ? 0.4 : 0}
            filter="url(#goldGlow)"
            style={{ transition: 'opacity 600ms ease-out' }}
          >
            {current < 0 && (
              <>
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="2s" repeatCount="indefinite" />
                <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite" />
              </>
            )}
          </circle>
          {/* escutcheon plate */}
          <rect x="452" y="254" width="22" height="62" rx="4" fill="url(#brassG)"/>
          <rect x="452" y="254" width="22" height="62" rx="4" fill="none" stroke="#9A7218" strokeWidth="0.5"/>
          {/* keyhole */}
          <ellipse cx="463" cy="274" rx="4.5" ry="4.5" fill="#3A2808"/>
          <path d="M460 274 L460 286 L466 286 L466 274" fill="#3A2808"/>
          {/* bolt - animated from locked → unlocked at layer 2 */}
          <rect
            x={current >= 2 ? 442 : 462}
            y="304"
            width="22"
            height="13"
            rx="3"
            fill="url(#brassG)"
            style={{ transition: 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)' }}
          />
          <rect
            x={current >= 2 ? 442 : 462}
            y="304"
            width="22"
            height="13"
            rx="3"
            fill="none"
            stroke="#9A7218"
            strokeWidth="0.5"
            style={{ transition: 'all 0.8s cubic-bezier(0.4, 0.0, 0.2, 1)' }}
          />
          {/* knob */}
          <circle cx="444" cy="285" r="13" fill="none" stroke="url(#brassG)" strokeWidth="2.5" style={{ transition: 'stroke 0.3s' }}/>
          <circle cx="444" cy="285" r="6" fill="url(#brassG)"/>
          <line x1="444" y1="274" x2="444" y2="296" stroke="#A87820" strokeWidth="1.5"/>
          <line x1="433" y1="285" x2="455" y2="285" stroke="#A87820" strokeWidth="1.5"/>
          <circle cx="444" cy="285" r="2" fill="#C89830"/>
          {/* lock hl */}
          <rect x="430" y="244" width="56" height="82" rx="5" fill="none" stroke="#D4A840" strokeWidth={current === 2 ? 2 : 0} opacity={current === 2 ? 0.9 : 0} style={{ transition: 'all 0.25s' }}/>
          </g>

          {/* EXIT SIGN — industrial wall-mounted, flickers once then holds red */}
          <g opacity={getElementOpacity('exit')}>
          {/* backplate */}
          <rect x="264" y="26" width="120" height="28" rx="4" fill="#141210"/>
          <rect
            x="266"
            y="28"
            width="116"
            height="24"
            rx="3"
            fill={current >= 3 ? '#2A0808' : '#0E0C0A'}
            style={{ transition: 'fill 400ms' }}
          />
          {/* tubes - flicker then stay lit */}
          <rect
            x="272"
            y="32"
            width="46"
            height="8"
            rx="2"
            fill={current >= 3 ? '#DC2626' : '#1A1816'}
            filter={current >= 3 ? 'url(#redGlow)' : undefined}
          >
            {current === 3 && (
              <animate attributeName="opacity" values="1;0.3;1;0.4;1" dur="0.4s" repeatCount="1" />
            )}
          </rect>
          <rect
            x="326"
            y="32"
            width="46"
            height="8"
            rx="2"
            fill={current >= 3 ? '#DC2626' : '#1A1816'}
            filter={current >= 3 ? 'url(#redGlow)' : undefined}
          >
            {current === 3 && (
              <animate attributeName="opacity" values="1;0.2;1;0.3;1" dur="0.4s" repeatCount="1" begin="0.05s" />
            )}
          </rect>
          {/* EXIT text */}
          <text
            x="324"
            y="44"
            textAnchor="middle"
            fontSize="11"
            fontWeight="500"
            fill={current >= 3 ? '#FF4444' : '#E24B4A'}
            opacity={current >= 3 ? 1 : 0.3}
            letterSpacing="3"
            style={{ transition: 'all 400ms' }}
          >EXIT ↗</text>
          {/* mounting screws */}
          <circle cx="271" cy="40" r="2" fill="#1E1C1A"/>
          <circle cx="377" cy="40" r="2" fill="#1E1C1A"/>
          {/* sign border */}
          <rect x="264" y="26" width="120" height="28" rx="4" fill="none" stroke="#2A2826" strokeWidth="0.8"/>
          {/* exit hl */}
          <rect x="256" y="18" width="136" height="44" rx="6" fill="none" stroke="#E24B4A" strokeWidth={current === 3 ? 2 : 0} opacity={current === 3 ? 0.9 : 0} style={{ transition: 'all 0.25s' }}/>
          </g>

          {/* THRESHOLD — polished brass strip */}
          <g opacity={getElementOpacity('threshold')}>
          <rect x="198" y="500" width="252" height="6" rx="1" fill="url(#threshG)"/>
          <rect x="198" y="500" width="252" height="6" rx="1" fill="none" stroke="#8A6818" strokeWidth="0.5" opacity="0.6"/>
          {/* threshold hl */}
          <rect x="196" y="496" width="256" height="14" rx="2" fill="none" stroke="#1D9E75" strokeWidth={current === 5 ? 2.5 : 0} opacity={current === 5 ? 0.95 : 0} style={{ transition: 'all 0.25s' }}/>
          </g>

          {/* FLOOR TRAP — hazard beyond threshold, deep red pulse (ominous) */}
          <g opacity={getElementOpacity('trap')}>
          <g
            opacity={current >= 4 ? 1 : 0.1}
            filter={current >= 4 ? 'url(#redGlow)' : undefined}
            style={{ transition: 'opacity 0.7s' }}
          >
            <rect
              x="270"
              y="520"
              width="108"
              height="28"
              rx="2"
              fill="#8B0000"
              opacity={current >= 4 ? 0.25 : 0.08}
            >
              {current >= 4 && (
                <animate attributeName="opacity" values="0.2;0.35;0.2" dur="3s" repeatCount="indefinite" />
              )}
            </rect>
            <rect
              x="270"
              y="520"
              width="108"
              height="28"
              rx="2"
              fill="none"
              stroke={current >= 4 ? '#DC2626' : '#E24B4A'}
              strokeWidth={current >= 4 ? 1.2 : 0.8}
              strokeDasharray="4 2"
              opacity={current >= 4 ? 0.8 : 0.55}
              style={{ transition: 'all 0.7s' }}
            />
            <line x1="270" y1="534" x2="378" y2="534" stroke={current >= 4 ? '#DC2626' : '#E24B4A'} strokeWidth="0.4" opacity="0.35"/>
            <text
              x="324"
              y="512"
              textAnchor="middle"
              fontSize="9"
              fill={current >= 4 ? '#FF4444' : '#E24B4A'}
              opacity={current >= 4 ? 0.9 : 0.7}
              fontWeight={current >= 4 ? 600 : 400}
              style={{ transition: 'all 0.7s' }}
            >trap</text>
          </g>
          <rect x="260" y="506" width="128" height="50" rx="3" fill="none" stroke="#E24B4A" strokeWidth={current === 4 ? 2 : 0} opacity={current === 4 ? 0.85 : 0} style={{ transition: 'all 0.25s' }}/>
          </g>

          {/* Door highlight */}
          <rect x="198" y="62" width="252" height="440" rx="1" fill="none" stroke="#C8A840" strokeWidth={current === 0 ? 2.5 : 0} opacity={current === 0 ? 0.85 : 0} style={{ transition: 'all 0.25s' }}/>

          {/* GLOW RINGS — sequential unlock indicators */}
          {/* Hinges glow (white) */}
          {current === 1 && (
            <g style={{ animation: 'glowPulse 1.2s ease-in-out infinite' }}>
              <rect x="176" y="96" width="44" height="68" rx="6" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.8"/>
              <rect x="176" y="344" width="44" height="68" rx="6" fill="none" stroke="#FFFFFF" strokeWidth="3" opacity="0.8"/>
            </g>
          )}

          {/* Lock glow (amber) */}
          {current === 2 && (
            <g style={{ animation: 'glowPulse 1.2s ease-in-out infinite' }}>
              <ellipse cx="463" cy="285" rx="32" ry="52" fill="none" stroke="#D4A840" strokeWidth="3" opacity="0.8"/>
            </g>
          )}

          {/* Exit sign glow (red lit) */}
          {current === 3 && (
            <g style={{ animation: 'glowPulse 1.2s ease-in-out infinite' }}>
              <rect x="258" y="22" width="128" height="36" rx="6" fill="#E24B4A" opacity="0.3"/>
              <rect x="258" y="22" width="128" height="36" rx="6" fill="none" stroke="#E24B4A" strokeWidth="3" opacity="0.8"/>
            </g>
          )}

          {/* Trap glow (red dashed border pulsing) */}
          {current === 4 && (
            <g style={{ animation: 'glowPulse 1.2s ease-in-out infinite' }}>
              <rect x="265" y="515" width="118" height="38" rx="3" fill="none" stroke="#E24B4A" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.8"/>
            </g>
          )}

          {/* Threshold glow (green) */}
          {current === 5 && (
            <g style={{ animation: 'glowPulse 1.2s ease-in-out infinite' }}>
              <rect x="194" y="496" width="260" height="14" rx="2" fill="none" stroke="#1D9E75" strokeWidth="3" opacity="0.8"/>
            </g>
          )}

          {/* TAP TO BEGIN — simple pulsing circle */}
          {current < 0 && (
            <g>
              {/* Pulsing circle */}
              <circle
                cx="324"
                cy="281"
                r="40"
                fill="#1D9E75"
                opacity="0.9"
                style={{ animation: 'beginBarPulse 2s ease-in-out infinite', transformOrigin: 'center' }}
              />
              {/* Text */}
              <text x="324" y="278" textAnchor="middle" fontSize="13" fontWeight="600" fill="#FFFFFF">
                Tap
              </text>
              <text x="324" y="292" textAnchor="middle" fontSize="13" fontWeight="600" fill="#FFFFFF">
                to begin
              </text>
            </g>
          )}

          {/* COMPLETION STATE — dynamic summary */}
          {current === 5 && (
            <g>
              {/* Background panel for summary */}
              <rect
                x="198"
                y="220"
                width="248"
                height="120"
                rx="8"
                fill="rgba(15,110,86,0.15)"
                stroke="#0F6E56"
                strokeWidth="1.5"
              />
              {/* Multi-line summary text */}
              <text x="322" y="245" textAnchor="middle" fontSize="10" fontWeight="500" fill="#F1EFE8" style={{ lineHeight: 1.5 }}>
                <tspan x="322" dy="0">{reviewResult.snapshot.hinge}</tspan>
                <tspan x="322" dy="16">{reviewResult.snapshot.lock}</tspan>
                <tspan x="322" dy="16">{reviewResult.snapshot.exit}</tspan>
                <tspan x="322" dy="20" fontWeight="600" fill="#1D9E75">Now you know what you're walking into.</tspan>
              </text>
            </g>
          )}

          {/* TAP ZONES */}
          <rect onClick={() => isZoneEnabled(0) && showStep(0)} x="198" y="62" width="252" height="440" fill="transparent" style={{ cursor: isZoneEnabled(0) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(0) ? 'all' : 'none' }}/>
          <rect onClick={() => isZoneEnabled(1) && showStep(1)} x="177" y="94" width="38" height="316" fill="transparent" style={{ cursor: isZoneEnabled(1) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(1) ? 'all' : 'none' }}/>
          <rect onClick={() => isZoneEnabled(2) && showStep(2)} x="428" y="242" width="58" height="86" fill="transparent" style={{ cursor: isZoneEnabled(2) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(2) ? 'all' : 'none' }}/>
          <rect onClick={() => isZoneEnabled(3) && showStep(3)} x="255" y="16" width="138" height="48" fill="transparent" style={{ cursor: isZoneEnabled(3) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(3) ? 'all' : 'none' }}/>
          <rect onClick={() => isZoneEnabled(4) && showStep(4)} x="258" y="498" width="132" height="56" fill="transparent" style={{ cursor: isZoneEnabled(4) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(4) ? 'all' : 'none' }}/>
          <rect onClick={() => isZoneEnabled(5) && showStep(5)} x="196" y="494" width="258" height="22" fill="transparent" style={{ cursor: isZoneEnabled(5) ? 'pointer' : 'not-allowed', pointerEvents: isZoneEnabled(5) ? 'all' : 'none' }}/>
        </svg>

        <div className="dd-dots-row">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`dd-dot ${i === current ? 'active' : i < current ? 'done' : ''}`}
              onClick={() => setDoorStep(i)}
            />
          ))}
        </div>

        {current >= 0 && current < 5 && (
          <div className="dd-reveal show">
            <div className="dd-label">
              {(() => {
                const label = steps[current].label;
                // Match pattern like "The door · clarity 10/20" and wrap the score fraction
                const match = label.match(/^(.+?)(\d+)(\/20)$/);
                if (match) {
                  return (
                    <>
                      {match[1]}
                      <span style={{ color: meta.color }}>{match[2]}{match[3]}</span>
                    </>
                  );
                }
                return label;
              })()}
            </div>
            {/* Framing line */}
            <div style={{
              fontSize: 11,
              color: '#888780',
              fontWeight: 400,
              fontStyle: 'italic',
              marginBottom: 8,
            }}>
              {(() => {
                const framingText = {
                  door: "What you're actually deciding",
                  hinge: "The one thing this decision is hanging on",
                  lock: "What you can't undo once you walk through",
                  exit: "How you get out if you're wrong",
                  trap: "What's waiting on the other side",
                  step: "Your move before you commit",
                };
                return framingText[steps[current].id] || '';
              })()}
            </div>
            <div className="dd-heading">{steps[current].heading}</div>
            <div className="dd-actions">
              {steps[current].nextIndex !== null && (
                <button
                  className="dd-btn dd-btn-next-pulse"
                  onClick={() => showStep(steps[current].nextIndex)}
                  style={{ background: '#2A2A28' }}
                >
                  {steps[current].nextLabel}
                </button>
              )}
              {current > 0 && (
                <button className="dd-btn" onClick={() => showStep(current - 1)}>
                  ← Back
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
