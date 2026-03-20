'use client';

import type { AgentAvatar as Avatar } from '@/lib/avatars';
import styles from './Agent.module.css';

type AgentAvatarBase = {
  avatar: Avatar;
};

type AgentAvatarGrid = AgentAvatarBase & {
  isSelected: boolean;
  onSelect: () => void;
  size?: never;
  showMask?: never;
  borderColor?: never;
  borderWidth?: never;
  glowEffect?: never;
  borderRadius?: never;
  onClick?: never;
};

type AgentAvatarArc = AgentAvatarBase & {
  size: number;
  showMask?: boolean;
  borderColor?: string;
  borderWidth?: number;
  glowEffect?: boolean;
  borderRadius?: number;
  onClick?: () => void;
  isSelected?: never;
  onSelect?: never;
};

export type AgentAvatarProps = AgentAvatarGrid | AgentAvatarArc;

function isArcMode(props: AgentAvatarProps): props is AgentAvatarArc {
  return 'size' in props && typeof props.size === 'number';
}

export function AgentAvatar(props: AgentAvatarProps) {
  const { avatar } = props;

  // Режим арки: крупный аватар с маской, бордером, свечением
  if (isArcMode(props)) {
    const {
      size,
      showMask = false,
      borderColor = 'rgba(102, 102, 102, 1)',
      borderWidth = 2,
      glowEffect = false,
      borderRadius = 60,
      onClick,
    } = props;

    const glowRadius1 = 20;
    const glowRadius2 = 15;
    const glowOpacity1 = 0.3;
    const glowOpacity2 = 0.5;
    const glowColor1 = borderColor.replace(/[\d.]+\)$/, `${glowOpacity1})`);
    const glowColor2 = borderColor.replace(/[\d.]+\)$/, `${glowOpacity2})`);

    const boxShadow = glowEffect
      ? `0 0 0 ${borderWidth}px ${borderColor}, 0 0 ${glowRadius1}px ${glowColor1}, 0 0 ${glowRadius2}px ${glowColor2}`
      : `0 0 0 ${borderWidth}px ${borderColor}`;

    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
        className={styles.agentArcRoot}
        style={{ width: size, height: size }}
      >
        <div
          className={styles.agentArcImageWrapper}
          style={{
            width: size,
            height: size,
            borderRadius,
            boxShadow,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatar.image}
            alt={avatar.name}
            width={size}
            height={size}
            className={styles.agentArcImage}
            loading="lazy"
            decoding="async"
          />
        </div>
        {showMask && avatar.mask && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar.mask}
            alt=""
            className={styles.agentArcMask}
            style={
              avatar.maskFit === 'width'
                ? { width: size, height: 'auto', maxHeight: 'none' }
                : { height: size, width: 'auto', maxWidth: 'none' }
            }
          />
        )}
      </div>
    );
  }

  // Режим сетки: кнопка с кольцом
  const { isSelected, onSelect } = props;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`${styles.agentGridButton} ${isSelected ? styles.agentGridButtonSelected : ''}`}
      title={avatar.name}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={avatar.image}
        alt={avatar.name}
        className={styles.agentGridImage}
        loading="lazy"
        decoding="async"
      />
    </button>
  );
}

