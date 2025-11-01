import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AffirmationBox({ 
  affirmation, 
  isEditing, 
  onEdit, 
  onChange, 
  onSave, 
  saving,
  onAddRepetition
}) {
  const navigate = useNavigate();
  
  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-lg overflow-hidden">
      <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6 sm:pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {(() => {
              const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');
              if (isHalloween) {
                return (
                  <div
                    className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center text-2xl"
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
                    className="w-12 h-12 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              );
            })()}
            <CardTitle className="affirmation-title text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Afirmația Mea
            </CardTitle>
          </div>
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
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-6 sm:pb-7">
        {isEditing ? (
          <Textarea
            value={affirmation}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Scrie afirmația ta personală aici..."
            className="min-h-[260px] sm:min-h-[340px] text-base sm:text-lg leading-relaxed resize-y rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500/60"
          />
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/90 px-4 py-5 sm:px-6 sm:py-6 shadow-inner ring-1 ring-gray-100 dark:ring-gray-700/60">
              {affirmation ? (
                <p className="text-base sm:text-lg leading-relaxed sm:leading-loose text-gray-800 dark:text-gray-100 whitespace-pre-wrap tracking-[0.01em]">
                  {affirmation}
                </p>
              ) : (
                <p className="text-sm sm:text-base text-gray-400 dark:text-gray-500 italic">
                  Adaugă afirmația ta personală apăsând pe iconița de editare
                </p>
              )}
            </div>
            {onAddRepetition && (
              <div className="flex justify-end pt-1">
                {(() => { const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween'); return (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddRepetition();
                    }}
                    size="icon"
                    className={`h-12 w-12 rounded-full text-white shadow-lg transition-transform active:scale-90 focus:scale-95 ${isHalloween ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
                    aria-label="Adaugă repetare"
                    title="Adaugă repetare"
                  >
                    {isHalloween ? '🎃' : '+'}
                  </Button>
                ); })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}