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
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {(() => {
              const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween');
              if (isHalloween) {
                return (
                  <div
                    className="w-9 h-9 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xl"
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
                  className="w-9 h-9 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              );
            })()}
            <CardTitle className="affirmation-title text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">
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
                <p className="text-base md:text-lg leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                  {affirmation}
                </p>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic">
                  Adaugă afirmația ta personală apăsând pe iconița de editare
                </p>
              )}
            </div>
            {/* Round green + button below text to add repetition - always at bottom */}
            {onAddRepetition && (
              <div className="flex justify-end mt-1.5">
                {(() => { const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween'); return (
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
                ); })()}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}