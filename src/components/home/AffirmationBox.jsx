import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save } from "lucide-react";

export default function AffirmationBox({ 
  affirmation, 
  isEditing, 
  onEdit, 
  onChange, 
  onSave, 
  saving 
}) {
  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-3xl shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/favicon_essence.png" alt="Essence Logo" className="w-12 h-12 object-contain" />
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Afirmația Mea Essence
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
        )}
      </CardContent>
    </Card>
  );
}