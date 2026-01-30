"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, ArrowRight, AlertCircle, CheckCircle, Check, Eye, EyeOff } from "lucide-react";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password requirements validation
  const passwordRequirements = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Contains a number', valid: /\d/.test(password) },
    { label: 'Contains uppercase letter', valid: /[A-Z]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.valid);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token || !email) {
        setError("Invalid reset link. Please request a new password reset.");
        setCheckingToken(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-reset-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, email }),
        });

        const data = await response.json();

        if (data.valid) {
          setIsValidLink(true);
        } else {
          setError(data.error || "This reset link has already been used or is invalid.");
        }
      } catch {
        setError("Failed to verify reset link. Please try again.");
      } finally {
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [token, email]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidLink || !token || !email) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!allRequirementsMet) {
      setError("Password does not meet all requirements.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
      } else {
        setSuccess("Password updated successfully. Redirecting to login...");
        setTimeout(() => router.push("/login"), 2000);
      }
    } catch {
      setError("Failed to update password. Please try again.");
    } finally {
      setLoading(false);
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

      {/* Loading State */}
      {checkingToken && (
        <div style={{ position: "relative", zIndex: 10, textAlign: "center" }}>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "1rem" }}>Verifying reset link...</div>
        </div>
      )}

      {!checkingToken && (
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
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#FFFFFF", textAlign: "center", marginBottom: "0.5rem" }}>
            Set a New Password
          </h1>
          <p style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: "2rem" }}>
            Choose a strong password for your account.
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

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                New password
              </label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <EyeOff style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                  ) : (
                    <Eye style={{ width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                  )}
                </button>
              </div>
              {/* Password Requirements */}
              {password && (
                <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  {passwordRequirements.map((req, index) => (
                    <div key={index} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Check
                        style={{
                          width: "16px",
                          height: "16px",
                          color: req.valid ? "#34d399" : "rgba(255,255,255,0.3)",
                          transition: "color 0.2s ease",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: req.valid ? "#34d399" : "rgba(255,255,255,0.5)",
                          transition: "color 0.2s ease",
                        }}
                      >
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.875rem", display: "block", marginBottom: "0.5rem" }}>
                Confirm password
              </label>
              <div style={{ position: "relative" }}>
                <Lock style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", width: "20px", height: "20px", color: "rgba(255,255,255,0.4)" }} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
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
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
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
              disabled={loading || !allRequirementsMet || password !== confirmPassword}
              style={{ 
                ...buttonPrimaryStyle, 
                opacity: (loading || !allRequirementsMet || password !== confirmPassword) ? 0.5 : 1, 
                cursor: (loading || !allRequirementsMet || password !== confirmPassword) ? "not-allowed" : "pointer" 
              }}
            >
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginTop: "1.5rem" }}>
            Back to{" "}
            <Link href="/login" style={{ color: "#00F5FF", textDecoration: "none" }}>
              login
            </Link>
          </p>
        </div>

        <Link
          href="/"
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
          <span>Back to home</span>
        </Link>
      </div>
      )}
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
