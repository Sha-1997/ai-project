"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Button,
  Toast,
} from "../../components/SharedUI";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  action: string;
  description: string;
  timestamp: string;
}

export default function CoreDashboardPage() {
  const [membershipStatus, setMembershipStatus] = useState<string>("ACTIVE");
  const [founderNumber, setFounderNumber] = useState<string>("JXF-N-0104");
  const [currentPlan, setCurrentPlan] = useState<string>("Founder Tier Launch Offer");
  const [pricePaid, setPricePaid] = useState<string>("49.00 AED");
  const [nextRenewal, setNextRenewal] = useState<string>("July 12, 2029");
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("success");
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string>("");

    // Initial Authentication & Load
    useEffect(() => {
  
  
      const ecosystemToken = localStorage.getItem("accessToken");
  
      const token =  ecosystemToken;
  
      if (!token) {
  
        triggerToast(
          "Please login to access the candidate portal console.",
          "error"
        );
  
        router.replace("/login");
  
        return;
      }
  
      setAuthToken(token);
  
    }, [router]);

  const [activities, setActivities] = useState<Activity[]>([
    { id: "1", action: "SSO_LOGIN", description: "Successfully logged in via secure SSO OTP gateway", timestamp: "Just now" },
    { id: "2", action: "MEMBERSHIP_UPGRADE", description: "Founder Tier Launch Offer payment processed. UAE VAT (5%) applied.", timestamp: "2 hours ago" },
    { id: "3", action: "PROFILE_SYNC", description: "Skills snapshot index parsed from candidate profile details", timestamp: "1 day ago" },
  ]);

  const triggerToast = (msg: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
  };

  const handlePortalRedirect = (role: "candidate" | "employer") => {
    triggerToast(`Routing session to the ${role} portal console...`, "info");
    setTimeout(() => {
      window.location.href = `/${role}`;
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[hsl(210,40%,96.1%)] p-6 md:p-12">
      {/* Container Wrap */}
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* TOP BAR / NAVIGATION */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-[hsl(214.3,31.8%,91.4%)] gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🚀</span>
              <h1 className="text-2xl font-bold text-[hsl(222.2,84%,4.9%)]">JovianeX Ecosystem Hub</h1>
            </div>
            <p className="text-sm text-[hsl(215.4,16.3%,46.9%)] mt-1">Unified access, settings telemetry, and membership dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[hsl(142.1,70.6%,45.3%)] text-white">
              ● Active Connection
            </span>
            <Button variant="outline" size="sm" onClick={() => triggerToast("Session keys verified.")}>Verify Session</Button>
          </div>
        </header>

        {/* NOTIFICATION ALERTS BANNER */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-sm font-semibold text-emerald-950">Welcome, Founder Member!</p>
              <p className="text-xs text-emerald-800">Your price-lock guarantee (49 AED/yr) is active for the next 3 years.</p>
            </div>
          </div>
          <span className="text-xs font-mono bg-emerald-100 text-emerald-900 px-2 py-1 rounded border border-emerald-200">
            Founder ID: {founderNumber}
          </span>
        </div>

        {/* METRICS & QUICK ACTIONS PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Subscription Telemetry */}
          <Card>
            <CardHeader>
              <CardTitle>Membership Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-[hsl(214.3,31.8%,91.4%)]">
                <span className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Status</span>
                <span className="text-sm font-semibold text-[hsl(142.1,70.6%,45.3%)]">{membershipStatus}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[hsl(214.3,31.8%,91.4%)]">
                <span className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Active Tier</span>
                <span className="text-sm font-semibold text-[hsl(222.2,84%,4.9%)]">{currentPlan}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[hsl(214.3,31.8%,91.4%)]">
                <span className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Amount Billed</span>
                <span className="text-sm font-semibold text-[hsl(222.2,84%,4.9%)]">{pricePaid} (incl. 5% VAT)</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Next Auto-Renewal</span>
                <span className="text-sm font-semibold text-[hsl(222.2,84%,4.9%)]">{nextRenewal}</span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={() => triggerToast("Invoice download triggered.", "success")}>Invoice PDF</Button>
              <Button variant="secondary" size="sm" onClick={() => triggerToast("Billing configurations synced.", "info")}>Manage Stripe</Button>
            </CardFooter>
          </Card>

          {/* Card 2: Quick Gateway Access */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Dynamic Modules Routing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-[hsl(215.4,16.3%,46.9%)]">
                Access your candidate profiles, search job postings, compile parsed resume fields, or transition into the employer/organization recruiter views.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-[hsl(214.3,31.8%,91.4%)] rounded-xl p-4 hover:shadow-md transition-all space-y-3 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👨‍💻</span>
                    <h4 className="font-semibold text-sm text-[hsl(222.2,84%,4.9%)]">Candidate Portal</h4>
                  </div>
                  <p className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Upload resumes, check ATS compatibility scores, and match open jobs.</p>
                  <Button variant="primary" size="sm" className="w-full mt-2" onClick={() => handlePortalRedirect("candidate")}>
                    Enter Candidate Portal
                  </Button>
                </div>

                <div className="border border-[hsl(214.3,31.8%,91.4%)] rounded-xl p-4 hover:shadow-md transition-all space-y-3 bg-white">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <h4 className="font-semibold text-sm text-[hsl(222.2,84%,4.9%)]">Employer Portal</h4>
                  </div>
                  <p className="text-xs text-[hsl(215.4,16.3%,46.9%)]">Create organizations listings, post jobs, and manage candidate workflows.</p>
                  <Button variant="secondary" size="sm" className="w-full mt-2" onClick={() => handlePortalRedirect("employer")}>
                    Enter Employer Portal
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RECENT SYSTEM LOGS */}
        <Card>
          <CardHeader>
            <CardTitle>Session History & Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[hsl(214.3,31.8%,91.4%)]">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                        {activity.action}
                      </span>
                      <span className="text-xs text-[hsl(215.4,16.3%,46.9%)]">{activity.timestamp}</span>
                    </div>
                    <p className="text-sm text-[hsl(222.2,84%,4.9%)]">{activity.description}</p>
                  </div>
                  <span className="text-emerald-500 font-semibold text-sm">✔ Verified</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Dynamic Toast Element */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
