'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Calendar as CalendarIcon, MapPin, Clock, CheckCircle, Edit3, X, Save, Camera } from 'lucide-react';
import { format, isFuture, isToday } from 'date-fns';

export default function CalendarPage() {
  const { user, profile } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
  const [momText, setMomText] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [savingMom, setSavingMom] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  async function fetchMeetings() {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_activities')
        .select(`
          *,
          md_entities(name, phone, billing_address)
        `)
        .eq('activity_type', 'MEETING')
        .eq('performed_by', user.id)
        .order('activity_date', { ascending: true });

      if (error) throw error;
      setMeetings((data as any[]) || []);
    } catch (err: any) {
      console.error("Failed to fetch meetings:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleCheckIn = async (meetingId: string) => {
    setLocationLoading(true);
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      const locationString = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
      
      try {
        const { error } = await supabase
          .from('crm_activities')
          .update({
            status: 'IN_PROGRESS',
            check_in_location: locationString,
            check_in_time: new Date().toISOString()
          })
          .eq('id', meetingId);

        if (error) throw error;
        alert('Checked in successfully!');
        fetchMeetings();
      } catch (err: any) {
        alert('Check-in failed: ' + err.message);
      } finally {
        setLocationLoading(false);
      }
    }, (error) => {
      alert('Failed to get location: ' + error.message);
      setLocationLoading(false);
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveMom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeeting) return;
    setSavingMom(true);
    
    try {
      let uploadedPhotoUrl = null;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `${selectedMeeting.id}_${Date.now()}.${fileExt}`;
        const filePath = `meeting_photos/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('crm_attachments')
          .upload(filePath, photoFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('crm_attachments')
          .getPublicUrl(filePath);
        
        uploadedPhotoUrl = publicUrlData.publicUrl;
      }

      const updatedDescription = selectedMeeting.description + '\n\n=== MINUTES OF MEETING ===\n' + momText;
      
      const { error } = await supabase
        .from('crm_activities')
        .update({
          description: updatedDescription,
          status: 'COMPLETED',
          ...(uploadedPhotoUrl && { photo_url: uploadedPhotoUrl })
        })
        .eq('id', selectedMeeting.id);

      if (error) throw error;
      alert('MOM saved! Meeting is now completed.');
      setSelectedMeeting(null);
      setMomText('');
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchMeetings();
    } catch (err: any) {
      alert('Failed to save MOM: ' + err.message);
    } finally {
      setSavingMom(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading Calendar...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
          <CalendarIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Schedule</h1>
          <p className="text-sm text-slate-500">Manage your field meetings, check-ins, and MOMs.</p>
        </div>
      </div>

      <div className="space-y-4">
        {meetings.length === 0 && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <CalendarIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No Meetings Scheduled</h3>
            <p className="text-slate-500 text-sm mt-1">Go to the Leads page to schedule your upcoming meetings.</p>
          </div>
        )}

        {meetings.map((meeting) => {
          const isCompleted = meeting.status === 'COMPLETED';
          const isInProgress = meeting.status === 'IN_PROGRESS';
          const isScheduled = !isCompleted && !isInProgress;
          const entityName = Array.isArray(meeting.md_entities) ? meeting.md_entities[0]?.name : (meeting.md_entities as any)?.name;

          return (
            <div key={meeting.id} className={`bg-white rounded-2xl border p-6 flex items-start gap-6 transition-all shadow-sm ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
              
              <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded-xl p-3 min-w-[100px]">
                <span className="text-xs font-bold text-slate-500 uppercase">{format(new Date(meeting.activity_date), 'MMM')}</span>
                <span className="text-2xl font-black text-slate-800 leading-none my-1">{format(new Date(meeting.activity_date), 'dd')}</span>
                <span className="text-xs font-bold text-indigo-600">{format(new Date(meeting.activity_date), 'HH:mm')}</span>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-slate-800">{entityName}</h3>
                  {isCompleted && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>}
                  {isInProgress && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">In Progress</span>}
                  {isScheduled && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">Scheduled</span>}
                </div>
                
                <p className="text-sm text-slate-600 mb-4 whitespace-pre-line border-l-2 border-slate-200 pl-3">
                  {meeting.description.split('=== MINUTES OF MEETING ===')[0]}
                </p>

                <div className="flex items-center gap-3">
                  {isScheduled && (
                    <button 
                      onClick={() => handleCheckIn(meeting.id)}
                      disabled={locationLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                    >
                      <MapPin className="w-4 h-4" /> 
                      {locationLoading ? 'Getting GPS...' : 'Check In Here'}
                    </button>
                  )}

                  {isInProgress && (
                    <button 
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setMomText('');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-colors"
                    >
                      <Edit3 className="w-4 h-4" /> Write MOM
                    </button>
                  )}

                  {isCompleted && (
                    <div className="text-sm text-slate-500 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      Checked in at {meeting.check_in_time ? format(new Date(meeting.check_in_time), 'HH:mm') : 'Unknown'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedMeeting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-[600px] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Minutes of Meeting (MOM)</h2>
                <p className="text-sm text-slate-500 mt-1">Record the outcome of your meeting.</p>
              </div>
              <button onClick={() => setSelectedMeeting(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveMom} className="p-6 flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <textarea 
                    rows={8} 
                    required
                    placeholder="Discussed pricing, next steps..."
                    value={momText} 
                    onChange={e => setMomText(e.target.value)} 
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm leading-relaxed"
                  ></textarea>
                </div>
                <div className="w-40 flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden relative bg-slate-50">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-400">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-xs font-semibold">Take Photo</span>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      className="hidden" 
                      onChange={handlePhotoSelect}
                    />
                  </label>
                  {photoPreview && (
                    <button 
                      type="button" 
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="text-xs text-red-500 font-semibold hover:text-red-700"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
              
              <div className="pt-2 flex justify-end">
                <button type="submit" disabled={savingMom} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">
                  {savingMom ? 'Saving...' : <><Save className="w-4 h-4" /> Save & Complete</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
