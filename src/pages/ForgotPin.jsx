
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPinPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: enter email, 2: success
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const users = await base44.entities.User.list();
      const user = users.find(u => u.email === email);

      if (!user) {
        setError("Nu există niciun cont cu acest email");
        setLoading(false);
        return;
      }

      // Send email with PIN using Core.SendEmail integration
      await base44.integrations.Core.SendEmail({
        to: email,
        subject: "PIN-ul tău pentru Afirmatii",
        body: `Bună ${user.first_name},\n\nPIN-ul tău este: ${user.pin}\n\nDacă nu ai solicitat această informație, te rugăm să ignori acest email.\n\nCu drag,\nEchipa Essence`
      });

      setStep(2);
    } catch (error) {
      console.error("Error sending reset email:", error);
      setError("Eroare la trimiterea email-ului. Te rog încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-none">
        <CardHeader className="space-y-4">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Login"))}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Înapoi
          </Button>
          <div className="flex justify-center">
            <img 
              src="https://essence-process.com/ro/wp-content/uploads/2022/10/logo-essence-int.png" 
              alt="Essence Logo" 
              className="w-40 h-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center text-gray-900">
            {step === 1 ? "Am uitat PIN-ul" : "Email trimis!"}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {step === 1 ? (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <p className="text-center text-gray-600">
                Introdu adresa de email asociată contului tău și îți vom trimite PIN-ul.
              </p>

              <form onSubmit={handleSendResetEmail} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-semibold">
                    Adresa de Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplu.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 text-lg"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    "Se trimite..."
                  ) : (
                    <>
                      <Mail className="w-5 h-5 mr-2" />
                      Trimite PIN-ul pe Email
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-10 h-10 text-green-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">
                  Verifică-ți emailul!
                </h3>
                <p className="text-gray-600">
                  Ți-am trimis un email la <strong>{email}</strong> cu PIN-ul tău.
                </p>
              </div>

              <Button
                onClick={() => navigate(createPageUrl("Autentificare"))}
                className="w-full h-12 bg-green-600 hover:bg-green-700"
              >
                Înapoi la Autentificare
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
