import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, Text, RefreshCw } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AffirmationBox({ 
  affirmation, 
  isEditing, 
  onEdit, 
  onChange, 
  onSave, 
  saving,
  onAddRepetition,
  isAdmin,
  todayRepetitions,
  dailyTarget = 100,
  userId
}) {
  const navigate = useNavigate();
  const [textSize, setTextSize] = useState("md");
  const [pulse, setPulse] = useState(false);

  // Load preferred text size from localStorage
  useEffect(() => {
    try {
      if (!userId) return;
      const stored = localStorage.getItem(`affirmation_text_size_${userId}`);
      if (stored === "sm" || stored === "md" || stored === "lg") {
        setTextSize(stored);
      }
    } catch (e) {
      // Ignore storage errors
    }
  }, [userId]);

  const handleTextSizeChange = () => {
    setTextSize((current) => {
      const next = current === "sm" ? "md" : current === "md" ? "lg" : "sm";
      try {
        if (userId) {
          localStorage.setItem(`affirmation_text_size_${userId}`, next);
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Text size steps carefully chosen so even "lg" is comfortably readable
  // without needing scroll on most devices.
  const textSizeClass =
    textSize === "sm"
      ? "text-sm leading-relaxed"
      : textSize === "lg"
      ? "text-lg leading-relaxed"
      : "text-base leading-relaxed";

  const progressPercentage =
    typeof todayRepetitions === "number" && dailyTarget
      ? Math.min(100, Math.max(0, (todayRepetitions / dailyTarget) * 100))
      : null;
  
  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {(() => {
              const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');
              if (isHalloween) {
                return (
                  <div
                    className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center text-lg"
                    title="Halloween"
                  >
                    🎃
                  </div>
                );
              }
              return (
                <img 
                  src="/logo_essece2.png?v=20251030" 
                  alt="App Logo" 
                  className="w-8 h-8 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              );
            })()}
            <CardTitle className="affirmation-title text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
              Afirmația Mea
            </CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {/* Page refresh icon */}
            {!isEditing && (
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                aria-label="Reîncarcă pagina"
                title="Reîncarcă pagina"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            {/* Text size toggle - cycles between small/medium/large */}
            {!isEditing && (
              <Button
                onClick={handleTextSizeChange}
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl"
                aria-label="Ajustează mărimea textului"
                title="Ajustează mărimea textului afirmației"
              >
                <Text className="w-4 h-4" />
              </Button>
            )}

            {!isEditing ? (
              <Button
                onClick={onEdit}
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl flex-shrink-0"
              >
                <Edit className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={onSave}
                disabled={saving}
                size="sm"
                className="bg-green-600 hover:bg-green-700 rounded-xl h-10 px-4 flex-shrink-0"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Se salvează..." : "Salvează"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <Textarea
            value={affirmation}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Scrie afirmația ta personală aici... (minim 400px înălțime)"
            className="min-h-[400px] text-lg leading-relaxed resize-y rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
        ) : (
          <div className="min-h-[160px] p-3 md:p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <div className="relative pb-12">
              {affirmation ? (
                <p className={`${textSizeClass} md:text-lg font-semibold text-gray-800 dark:text-gray-200 whitespace-pre-wrap`}>
                  {affirmation}
                </p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  Adaugă afirmația ta personală apăsând pe iconița de editare
                </p>
              )}
            </div>
            {/* Repetition button / progress - always at bottom */}
            {onAddRepetition && (
              <div className="mt-2 w-full">
                {(() => { 
                  const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');

                  // For admins, show a larger progress-style button; for others keep the original round button
                  if (isAdmin && progressPercentage !== null) {
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Trigger a short green pulse animation locally
                          setPulse(false);
                          setTimeout(() => setPulse(true), 0);
                          onAddRepetition();
                        }}
                        className={`relative overflow-hidden h-12 md:h-14 w-full rounded-full shadow-[0_8px_20px_rgba(16,185,129,0.35)] transition-transform active:scale-95 focus:scale-95 border border-emerald-300/80 bg-white/40 cursor-pointer backdrop-blur-md ${pulse ? 'aff-pulse-green' : ''}`}
                        aria-label="Adaugă repetare"
                        title="Am repetat afirmația"
                      >
                        <div
                          className={`absolute inset-y-1 left-1 rounded-full transition-all duration-500 ease-out ${isHalloween ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 'bg-gradient-to-r from-green-500 to-green-600'}`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                        <div className="relative z-10 flex items-center justify-center px-4">
                          <div className="flex flex-col items-center text-center gap-0.5">
                            <span className="text-[13px] md:text-sm font-semibold text-emerald-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                              Am repetat afirmația (+1)
                            </span>
                            <span className="text-[11px] md:text-xs font-semibold text-emerald-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
                              Progres azi: {todayRepetitions ?? 0} / {dailyTarget}
                            </span>
                          </div>
                          {/* Glassy pill with +, floating on the far right, while text stays perfectly centered */}
                          <span className="absolute right-3 md:right-4 flex items-center justify-center">
                            <span className="flex items-center justify-center h-9 px-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-[0_8px_22px_rgba(22,163,74,0.6)] border border-green-400">
                              <span className="text-white text-2xl leading-none font-semibold">+</span>
                            </span>
                          </span>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddRepetition();
                      }}
                      size="icon"
                      className={`h-10 w-10 md:h-12 md:w-12 rounded-full text-white shadow-lg transition-transform active:scale-90 focus:scale-95 ${
                        isHalloween
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      }`}
                      aria-label="Adaugă repetare"
                      title="Adaugă repetare"
                    >
                      {isHalloween ? (
                        '🎃'
                      ) : (
                        <span className="text-white text-xl leading-none font-semibold">+</span>
                      )}
                    </Button>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}