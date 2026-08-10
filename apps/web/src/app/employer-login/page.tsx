'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import GoogleProvider from '@/components/providers/GoogleProvider';
import AppleProvider from '@/components/providers/AppleProvider';

declare global {
  interface Window {
    AppleID: any;
  }
}

function EmployerLoginPage() {
  const [appleLoaded, setAppleLoaded] = useState(false);

  const router = useRouter();


  useEffect(() => {
    const script = document.createElement('script');

    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid.auth.js';

    script.async = true;

    script.onload = () => {
      console.log('Apple SDK loaded');

      if (window.AppleID) {
        window.AppleID.auth.init({
          clientId: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,

          scope: 'name email',

          redirectURI: window.location.origin,

          usePopup: true,
        });

        setAppleLoaded(true);
      }
    };

    script.onerror = () => {
      console.log('Apple SDK loading failed');
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);
  // =======================
  // Check Existing Session
  // =======================

  useEffect(() => {
    const employerToken = localStorage.getItem('employer_token');

    const ecosystemToken = localStorage.getItem('accessToken');

    if (employerToken || ecosystemToken) {
      router.replace('/employer');
    }
  }, [router]);

  const [method, setMethod] = useState<'email' | 'mobile'>('email');

  const [email, setEmail] = useState('');

  const [mobile, setMobile] = useState('');

  const [otp, setOtp] = useState('');

  const [otpSent, setOtpSent] = useState(false);

  const [error, setError] = useState('');

  const [otpTimer, setOtpTimer] = useState(0);

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  const [successMessage, setSuccessMessage] = useState('');

  /*
  =====================================
  OTP TIMER
  =====================================
  */

  useEffect(() => {
    if (otpTimer <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);

          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [otpTimer]);

  // =======================
  // Send   Email OTP
  // =======================

  async function sendEmailOtp() {
    try {
      setLoading(true);

      setErrorMessage('');

      setSuccessMessage('');

      const res = await fetch('http://localhost:5000/api/v1/auth/send-email-otp', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          email,
        }),
      });

      const data = await res.json();

      console.log('SEND OTP RESPONSE', data);

      /*
    Backend cooldown error
    */

      if (!res.ok) {
        setErrorMessage(data.message || 'OTP sending failed');

        /*
      Extract seconds from:
      Please wait 53 seconds...
      */

        const match = data.message?.match(/\d+/);

        if (match) {
          setOtpTimer(Number(match[0]));
        }

        return;
      }

      /*
    OTP success
    */

      setOtpSent(true);

      setSuccessMessage('OTP sent successfully');

      /*
    Start 60 sec timer

    */

      if (data.resendAvailableAt) {
        const resendTime = new Date(data.resendAvailableAt).getTime();

        const seconds = Math.ceil((resendTime - Date.now()) / 1000);

        setOtpTimer(seconds);
      } else {
        // fallback

        setOtpTimer(60);
      }
    } catch (error) {
      setErrorMessage('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // Verify Email OTP
  // =======================

  async function verifyEmailOtp() {
    try {
      setLoading(true);

      setErrorMessage('');
      setSuccessMessage('');

      const res = await fetch('http://localhost:5000/api/v1/auth/employer-login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          provider: 'EMAIL_OTP',
          email,
          otp,
        }),
      });

      const data = await res.json();

      console.log('EMAIL OTP LOGIN RESPONSE', data);

      if (!res.ok) {
        setErrorMessage(data.message || 'Invalid OTP');

        return;
      }

      const tokenData = data.data || data;

      localStorage.setItem('employer_token', tokenData.accessToken);

      localStorage.setItem('employer_refresh_token', tokenData.refreshToken);

      router.replace('/employer');
    } catch (error) {
      console.log(error);

      setErrorMessage('Verification failed');
    } finally {
      setLoading(false);
    }
  }

  //sendmobileotp
  async function sendMobileOtp() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:5000/api/v1/auth/send-mobile-otp', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          mobile,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Mobile OTP failed');

        return;
      }

      setOtpSent(true);
    } catch (error) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  //verify MOBILE OTP
  async function verifyMobileOtp() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:5000/api/v1/auth/employer-login', {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          provider: 'MOBILE_OTP',

          mobile,

          otp,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Mobile OTP failed');

        return;
      }

      localStorage.setItem('employer_token', data.data.accessToken);

      localStorage.setItem('employer_refresh_token', data.data.refreshToken);

      router.push('/employer/dashboard');
    } catch (error) {
      setError('Verification failed');
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // Google Login
  // =======================

  async function googleLoginSuccess(credentialResponse: any) {
    try {
      setLoading(true);
      setError('');

      const idToken = credentialResponse.credential;

      const res = await fetch('http://localhost:5000/api/v1/auth/employer-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'GOOGLE',
          idToken: idToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Google login failed');

        return;
      }

      if (data.data?.accessToken) {
        localStorage.setItem('employer_token', data.data.accessToken);

        localStorage.setItem('employer_refresh_token', data.data.refreshToken);

        router.push('/employer');
      }
    } catch (err) {
      console.log(err);

      setError('Google login failed');
    } finally {
      setLoading(false);
    }
  }

  // =======================
  // Apple
  // =======================

  async function appleLogin() {
    try {
      if (!appleLoaded || !window.AppleID) {
        setError('Apple Sign In not loaded');

        return;
      }

      const response = await window.AppleID.auth.signIn();

      console.log('Apple response', response);
    } catch (error) {
      console.error('Apple error', error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f111a] px-4 py-8 font-sans text-white">
      <div className="w-full max-w-md rounded-2xl border border-[#2e354f] bg-[#181b28]/80 p-8 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            JovianeX
          </h2>

          <p className="mt-2 text-sm text-gray-400">Employer Portal</p>
        </div>

        {/* Login Method */}
        <div className="mb-6 flex rounded-lg bg-[#0f111a] p-1">
          <button
            onClick={() => {
              setMethod('email');
              setOtpSent(false);
            }}
            className={`flex-1 rounded-md py-2 text-sm transition ${
              method === 'email' ? 'bg-indigo-600 text-white' : 'text-gray-400'
            }`}
          >
            Email OTP
          </button>

          <button
            onClick={() => {
              setMethod('mobile');
              setOtpSent(false);
            }}
            className={`flex-1 rounded-md py-2 text-sm transition ${
              method === 'mobile' ? 'bg-indigo-600 text-white' : 'text-gray-400'
            }`}
          >
            Mobile OTP
          </button>
        </div>

        {/* Email / Mobile Input */}
        {method === 'email' ? (
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="
            w-full
            rounded-lg
            border
            border-[#2e354f]
            bg-[#0f111a]
            px-4
            py-3
            text-white
            outline-none
            focus:border-indigo-500
            "
          />
        ) : (
          <input
            type="tel"
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="
            w-full
            rounded-lg
            border
            border-[#2e354f]
            bg-[#0f111a]
            px-4
            py-3
            text-white
            outline-none
            focus:border-indigo-500
            "
          />
        )}

        {/* OTP Input */}

        {otpSent && (
          <div>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="
                mt-4
                w-full
                rounded-lg
                border
                border-[#2e354f]
                bg-[#0f111a]
                px-4
                py-3
                text-white
                "
            />

            {otpTimer > 0 ? (
              <p className="mt-3 text-gray-400">Resend OTP in {otpTimer}s</p>
            ) : (
              <button
                type="button"
                onClick={sendEmailOtp}
                className="
                mt-3
                text-indigo-400
                "
              >
                Resend OTP
              </button>
            )}
          </div>
        )}

        {errorMessage && <p className="mt-3 text-red-500">{errorMessage}</p>}

        {successMessage && <p className="mt-3 text-green-500">{successMessage}</p>}

        {/* OTP Button */}

        <button
          onClick={
            otpSent
              ? method === 'email'
                ? verifyEmailOtp
                : verifyMobileOtp
              : method === 'email'
                ? sendEmailOtp
                : sendMobileOtp
          }
          disabled={loading || (!otpSent && otpTimer > 0)}
          className="
          mt-5
          w-full
          rounded-lg
          bg-indigo-600
          py-3
          font-semibold
          transition
          hover:bg-indigo-500
          disabled:opacity-50
          "
        >
          {loading
            ? 'Please wait...'
            : otpSent
              ? 'Verify OTP'
              : otpTimer > 0
                ? `Resend OTP in ${otpTimer}s`
                : 'Send OTP'}
        </button>

        {/* Divider */}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-[#2e354f]" />

          <span className="text-xs text-gray-500">OR</span>

          <div className="h-px flex-1 bg-[#2e354f]" />
        </div>

        {/* Google */}
        <div className="mt-4 flex w-full justify-center">
          <GoogleLogin
            onSuccess={googleLoginSuccess}
            onError={() => setError('Google login failed')}
            width="350"
            theme="filled_black"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </div>

        {/* Apple */}

        <button
          onClick={appleLogin}
          className="
          mt-4
          w-full
          rounded-lg
          border
          border-gray-700
          bg-black
          py-3
          transition
          hover:bg-gray-900
          "
        >
           Continue with Apple
        </button>

        {/* Error */}

        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <GoogleProvider>
      <AppleProvider>
        <EmployerLoginPage />
      </AppleProvider>
    </GoogleProvider>
  );
}
