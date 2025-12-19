import React, { useRef, useEffect } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: (error: any) => void;
  siteKey: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  className?: string;
}

const Captcha: React.FC<CaptchaProps> = ({
  onVerify,
  onExpire,
  onError,
  siteKey,
  theme = 'light',
  size = 'normal',
  className = '',
}) => {
  const captchaRef = useRef<HCaptcha>(null);

  const handleVerify = (token: string) => {
    onVerify(token);
  };

  const handleExpire = () => {
    if (onExpire) {
      onExpire();
    }
  };

  const handleError = (error: any) => {
    if (onError) {
      onError(error);
    }
  };

  const reset = () => {
    if (captchaRef.current) {
      captchaRef.current.resetCaptcha();
    }
  };

  // Expose reset method to parent component
  useEffect(() => {
    if (captchaRef.current) {
      (captchaRef.current as any).reset = reset;
    }
  }, []);

  return (
    <div className={`captcha-container ${className}`}>
      <HCaptcha
        ref={captchaRef}
        sitekey={siteKey}
        onVerify={handleVerify}
        onExpire={handleExpire}
        onError={handleError}
        theme={theme}
        size={size}
      />
    </div>
  );
};

export default Captcha;