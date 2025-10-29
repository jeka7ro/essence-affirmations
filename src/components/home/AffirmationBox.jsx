import React, { useState } from "react";
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
  const [pumpkins, setPumpkins] = useState([]);

  const createPumpkins = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newPumpkins = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: centerX,
      y: centerY,
      angle: (i * 45) * (Math.PI / 180),
      distance: 80 + Math.random() * 40,
    }));
    
    setPumpkins(newPumpkins);
    
    setTimeout(() => {
      setPumpkins([]);
    }, 2000);
  };
  
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
                    className="w-12 h-12 rounded-xl bg-orange-500 text-white flex items-center justify-center text-2xl cursor-pointer hover:opacity-90 transition-opacity relative"
                    onClick={(e) => {
                      createPumpkins(e);
                      navigate(createPageUrl("Home"));
                    }}
                    title="Halloween"
                  >
                    🎃
                  </div>
                );
              }
              return (
                <img 
                  src="/logo_essece2.png" 
                  alt="App Logo" 
                  className="w-12 h-12 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity" 
                  onClick={() => navigate(createPageUrl("Home"))}
                />
              );
            })()}
            <CardTitle className="affirmation-title text-2xl font-bold text-gray-900 dark:text-gray-100">
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
          <div className="min-h-[200px] p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
            <div className="relative pb-16">
              {affirmation ? (
                <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
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
              <div className="flex justify-end mt-2">
                {(() => { const isHalloween = typeof document !== 'undefined' && document.documentElement.classList.contains('halloween'); return (
                  <Button
                    onClick={onAddRepetition}
                    size="icon"
                    className={`h-12 w-12 rounded-full text-white shadow-lg ${isHalloween ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}`}
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
      {/* Animated pumpkins container */}
      {pumpkins.length > 0 && (
        <>
          <div className="fixed inset-0 pointer-events-none z-50">
            {pumpkins.map((pumpkin) => {
              const deltaX = (pumpkin.x + Math.cos(pumpkin.angle) * pumpkin.distance) - pumpkin.x;
              const deltaY = (pumpkin.y + Math.sin(pumpkin.angle) * pumpkin.distance - 50) - pumpkin.y;
              
              return (
                <div
                  key={pumpkin.id}
                  className="absolute text-2xl"
                  style={{
                    left: `${pumpkin.x}px`,
                    top: `${pumpkin.y}px`,
                    animation: `pumpkinJump${pumpkin.id} 2s ease-out forwards`,
                  }}
                >
                  <style>{`
                    @keyframes pumpkinJump${pumpkin.id} {
                      0% {
                        transform: translate(-50%, -50%) scale(1) rotate(0deg);
                        opacity: 1;
                      }
                      100% {
                        transform: translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px)) scale(0.4) rotate(360deg);
                        opacity: 0;
                      }
                    }
                  `}</style>
                  🎃
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}