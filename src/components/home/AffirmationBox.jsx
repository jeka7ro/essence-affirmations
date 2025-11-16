import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, Text } from "lucide-react";
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

  const textSizeClass =
    textSize === "sm"
      ? "text-base leading-relaxed"
      : textSize === "lg"
      ? "text-xl leading-relaxed"
      : "text-lg leading-relaxed";

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
            <div className="relative pb-12 max-h-[260px] overflow-y-auto">
              {affirmation ? (
                <p className={`${textSizeClass} md:text-lg text-gray-800 dark:text-gray-200 whitespace-pre-wrap`}>
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
                          onAddRepetition();
                        }}
                        className="relative overflow-hidden h-12 md:h-14 w-full rounded-full shadow-lg transition-transform active:scale-95 focus:scale-95 border border-yellow-300/70 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-gray-800 dark:to-gray-900 cursor-pointer"
                        aria-label="Adaugă repetare"
                        title="Am repetat afirmația"
                      >
                        <div
                          className={`absolute inset-0 transition-all duration-500 ease-out ${isHalloween ? 'bg-gradient-to-r from-orange-500/70 to-orange-600/80' : 'bg-gradient-to-r from-green-500/70 to-emerald-500/80'}`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                        <div className="relative z-10 flex flex-col items-center justify-center px-4">
                          <span className="text-[13px] md:text-sm font-semibold text-gray-800 dark:text-gray-100">
                            Am repetat afirmația (+1)
                          </span>
                          <span className="text-[11px] md:text-xs font-bold text-amber-800 dark:text-amber-200">
                            Progres azi: {todayRepetitions ?? 0} / {dailyTarget}
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
                      className={`h-10 w-10 md:h-12 md:w-12 rounded-full text-white shadow-lg transition-transform active:scale-90 focus:scale-95 ${isHalloween ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                      aria-label="Adaugă repetare"
                      title="Adaugă repetare"
                    >
                      {isHalloween ? '🎃' : '+'}
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