import React from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';

export default function BrandLogo({ size = 'md', showIcon = true, to = '/', className = '' }) {
  const isSm = size === 'sm';
  const isLg = size === 'lg';

  const iconBoxSize = isSm ? '32px' : isLg ? '46px' : '38px';
  const iconSize = isSm ? 18 : isLg ? 26 : 22;
  const titleSize = isSm ? '1.25rem' : isLg ? '2rem' : '1.5rem';
  const subtitleSize = isSm ? '9px' : isLg ? '12px' : '10px';

  const content = (
    <div className={`d-inline-flex align-items-center gap-2 text-decoration-none ${className}`}>
      {showIcon && (
        <div
          className="bg-danger rounded-2 d-flex align-items-center justify-content-center shadow-sm flex-shrink-0"
          style={{ width: iconBoxSize, height: iconBoxSize }}
        >
          <Film size={iconSize} className="text-white" />
        </div>
      )}
      <div className="d-flex flex-column justify-content-center leading-none">
        <span
          className="fw-extrabold text-white lh-1 tracking-tight"
          style={{ fontSize: titleSize, letterSpacing: '-0.5px' }}
        >
          Log <span className="text-danger">IT!</span>
        </span>
        <span
          className="fw-semibold text-secondary text-uppercase tracking-widest mt-1 lh-1"
          style={{
            fontSize: subtitleSize,
            letterSpacing: isLg ? '2.5px' : '1.8px',
            color: '#a1a1aa'
          }}
        >
          — by GDK —
        </span>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="text-decoration-none">
        {content}
      </Link>
    );
  }

  return content;
}
