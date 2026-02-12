"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from 'next-intl';
import Link from "next/link";
import Image from "next/image";
import { Mail, ArrowRight, AlertCircle, CheckCircle, Lock, Eye, EyeOff } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

type Step = 'email' | 'code' | 'password';

export default function ForgotPasswordPage() {
  const t = useTranslations('forgotPassword');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem 1rem",
    paddingLeft: "3rem",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "0.75rem",
    color: "#FFFFFF",
    fontSize: "1rem",
    outline: "none",
    transition: "all 0.3s ease",
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
    width: "100%",
    padding: "0.875rem 1.5rem",
    background: "linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)",
    border: "none",
    borderRadius: "0.75rem",
    color: "#000",
    fontWeight: 600,
    fontSize: "1rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  const codeInputStyle: React.CSSProperties = {
    width: "48px",
    height: "56px",
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: 600,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: "0.75rem",
    color: "#FFFFFF",
    outline: "none",
  };

  // Step 1: Send verification code
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(normalizedEmail)) {
        setError(t('invalidEmail'));
        return;
      }

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('sendCodeFailed'));
      } else {
        setStep('code');
        setResendCooldown(180);
        setSuccess(t('codeSent'));
      }
    } catch {
      setError(t('sendCodeFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }
    setCode(newCode);
    if (pastedData.length > 0) {
      codeInputRefs.current[Math.min(pastedData.length, 5)]?.focus();
    }
  };

  // Step 2: Verify code and go to password step
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError(t('enterCode'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: fullCode }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('invalidCode'));
      } else {
        setStep('password');
        setSuccess(t('codeVerified'));
      }
    } catch {
      setError(t('verifyFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError(t('min8Chars'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('mismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password-with-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          code: code.join(""),
          newPassword 
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error || t('resetFailed'));
      } else {
        setSuccess(t('resetSuccess'));
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch {
      setError(t('resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), resend: true }),
      });

      if (response.ok) {
        setResendCooldown(180);
        setSuccess(t('newCodeSent'));
        setCode(["", "", "", "", "", ""]);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || t('resendCodeFailed'));
      }
    } catch {
      setError(t('resendCodeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 'email': return t('stepEmailTitle');
      case 'code': return t('stepCodeTitle');
      case 'password': return t('stepPasswordTitle');
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 'email': return t('stepEmailDesc');
      case 'code': return `${t('stepCodeDesc')}`;
      case 'password': return t('stepPasswordDesc');
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0F",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <AnimatedBackground />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "28rem" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginBottom: "2rem",
            textDecoration: "none",
          }}
        >
          <Image src="/logo-white.svg" alt="FibAlgo Logo" width={180} height={50} priority />
        </Link>

        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "1rem",
            padding: "2rem",
          }}
        >
          {/* Step indicator */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {['email', 'code', 'password'].map((s, i) => (
              <div
                key={s}
                style={{
                  width: "2rem",
                  height: "4px",
                  borderRadius: "2px",
                  background: i <= ['email', 'code', 'password'].indexOf(step) 
                    ? "linear-gradient(135deg, #00F5FF 0%, #00A8FF 100%)" 
                    : "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>

          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", textAlign: "center", marginBottom: "0.5rem" }}>
            {getStepTitle()}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "2rem", fontSize: "0.875rem" }}>
            {getStepDescription()}
          </p>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
              }}
            >
              <AlertCircle style={{ width: "20px", height: "20px", color: "#f87171", flexShrink: 0 }} />
              <span style={{ color: "#f87171", fontSize: "0.875rem" }}>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                marginBottom: "1.5rem",
              }}
            >
              <CheckCircle style={{ width: "20px", height: "20px", color: "#34d399", flexShrink: 0 }} />
              <span style={{ color: "#34d399", fontSize: "0.875rem" }}>{success}</span>
            </div>
          )}

          {/* Step 1: Email */}
          {step === 'email' && (
            <form noValidate onSubmit={handleSendCode} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                  {t('emailLabel')}
                </label>
                <div style={{ position: "relative" }}>
                  <Mail style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                    style={inputStyle}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...buttonPrimaryStyle, opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? t('sending') : t('sendCode')}
              </button>
            </form>
          )}

          {/* Step 2: Code */}
          {step === 'code' && (
            <form noValidate onSubmit={handleVerifyCode} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }} onPaste={handleCodePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { codeInputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    style={codeInputStyle}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || code.join("").length !== 6}
                style={{ 
                  ...buttonPrimaryStyle, 
                  opacity: (loading || code.join("").length !== 6) ? 0.5 : 1, 
                  cursor: (loading || code.join("").length !== 6) ? "not-allowed" : "pointer" 
                }}
              >
                {loading ? t('verifying') : t('verifyCode')}
              </button>

              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
                {t('noCode')}{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || loading}
                  style={{
                    background: "none",
                    border: "none",
                    color: resendCooldown > 0 ? "rgba(255,255,255,0.3)" : "#00F5FF",
                    cursor: resendCooldown > 0 ? "default" : "pointer",
                    padding: 0,
                  }}
                >
                  {resendCooldown > 0 ? `${t('resendSending')} ${resendCooldown}s` : t('resendCode')}
                </button>
              </p>

              <button
                type="button"
                onClick={() => { setStep('email'); setCode(["", "", "", "", "", ""]); setError(""); setSuccess(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                ← {t('changeEmail')}
              </button>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <form noValidate onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                  {t('newPasswordLabel')}
                </label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('newPasswordPlaceholder')}
                    style={{ ...inputStyle, paddingRight: "3rem" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showPassword ? (
                      <EyeOff style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                    ) : (
                      <Eye style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                  {t('confirmLabel')}
                </label>
                <div style={{ position: "relative" }}>
                  <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPlaceholder')}
                    style={{ ...inputStyle, paddingRight: "3rem" }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: "1rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                    ) : (
                      <Eye style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ ...buttonPrimaryStyle, opacity: loading ? 0.5 : 1, cursor: loading ? "not-allowed" : "pointer" }}
              >
                {loading ? t('resetting') : t('resetButton')}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginTop: "1.5rem" }}>
            {t('remembered')}{" "}
            <Link href="/login" style={{ color: "#00F5FF", textDecoration: "none" }}>
              {t('backToLogin')}
            </Link>
          </p>
        </div>

        <Link
          href="/login"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            color: "rgba(255,255,255,0.4)",
            marginTop: "1.5rem",
            textDecoration: "none",
          }}
        >
          <ArrowRight style={{ width: "16px", height: "16px", transform: "rotate(180deg)" }} />
          <span>{t('backToLogin')}</span>
        </Link>
      </div>
    </main>
  );
}
