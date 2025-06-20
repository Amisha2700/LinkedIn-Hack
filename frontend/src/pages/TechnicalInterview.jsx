import React, { useState, useRef, useEffect } from "react";
import { fastAPIService } from '../services/api';

// TechnicalInterview component handles the full technical interview flow:
// - Resume upload, role, difficulty selection
// - Chat-based Q&A with AI (text/audio)
// - Audio recording, playback, and transcript handling
// - Feedback and heatmap display after interview
const TechnicalInterview = () => {
  const [showForm, setShowForm] = useState(false);
  const [resume, setResume] = useState(null);
  const [role, setRole] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [firstQuestionAudio, setFirstQuestionAudio] = useState(null);
  const [awaitingFirstAnswer, setAwaitingFirstAnswer] = useState(false);
  const [recordingMessage, setRecordingMessage] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [firstQuestionAnswered, setFirstQuestionAnswered] = useState(false);
  const [heatmap, setHeatmap] = useState(null);
  const [textAnswer, setTextAnswer] = useState(""); 
  const [messages, setMessages] = useState([]); 
  const [isAITyping, setIsAITyping] = useState(false); 
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatEndRef = useRef(null);

  // Add message to chat
  const addMessage = (role, content, audioUrl = null) => {
    setMessages(msgs => {
      const newMsgs = [...msgs, { role, content, time: new Date().toLocaleTimeString(), audioUrl }];
      if (role === 'assistant' && audioUrl) {
        const audio = new Audio(audioUrl);
        audio.playbackRate = 1.20; 
        audio.play();
      }
      return newMsgs;
    });
  };

  // Start the interview: upload resume, set role/difficulty, get first question (with audio)
  const handleInterviewStart = async () => {
    if (!resume || !role.trim() || !difficulty) {
      setError("Please fill all the fields before starting the interview.");
      return;
    }
    setError("");
    setLoading(true);
    setInterviewStarted(true); 
    setShowForm(false);
    try {
      await fastAPIService.analyzeResume(resume);
      await fastAPIService.setPosition(role);
      await fastAPIService.setDifficulty(difficulty);
      await fastAPIService.setInterviewType('technical');
      const response = await fastAPIService.getFirstQuestion();
      const audioUrl = URL.createObjectURL(new Blob([response.data], { type: 'audio/mpeg' }));
      setFirstQuestionAudio(audioUrl);
      setAwaitingFirstAnswer(true);
      setFirstQuestionAnswered(false); 
      addMessage('assistant', "Let's start with a quick introduction. Please introduce yourself.", audioUrl);
    } catch (err) {
      setError((err.response?.data?.message || err.message || 'Failed to start interview'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Submit an audio answer to the backend, get next question and update chat
  const submitAnswerToTalk = async (audioBlob) => {
    try {
      setLoading(true);
      setIsAITyping(true); 
      const formData = new FormData();
      formData.append('file', audioBlob, 'answer.webm');
      const response = await fetch('http://localhost:8000/talk', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to get next question');
      const data = await response.json();
      try {
        const transcriptRes = await fetch('http://localhost:8000/last_transcript');
        if (transcriptRes.ok) {
          const transcriptData = await transcriptRes.json();
          if (transcriptData.transcript && transcriptData.transcript.trim()) {
            addMessage('user', transcriptData.transcript);
          }
        }
      } catch (e) {
      }
      let audioUrl = null;
      if (data.audio_base64) {
        const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
      }
      addMessage('assistant', data.text || '', audioUrl);
      setFirstQuestionAudio(audioUrl);
      setFirstQuestionAnswered(true); 
      setAwaitingFirstAnswer(true);
    } catch (err) {
      setError('Failed to submit answer or get next question');
      console.error(err);
    } finally {
      setIsAITyping(false); 
      setLoading(false);
    }
  };

  // Submit a text answer to the backend, get next question and update chat (with text and audio)
  const submitTextAnswer = async () => {
    if (!textAnswer.trim()) return;
    addMessage('user', textAnswer);
    setLoading(true);
    setIsAITyping(true); 
    try {
      const response = await fetch('http://localhost:8000/talk_text_full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: textAnswer })
      });
      if (!response.ok) throw new Error('Failed to get next question');
      const data = await response.json();
      const audioBytes = Uint8Array.from(atob(data.audio_base64), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBytes], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      addMessage('assistant', data.text, audioUrl);
      setFirstQuestionAudio(audioUrl);
      setFirstQuestionAnswered(true);
      setAwaitingFirstAnswer(true);
      setTextAnswer("");
    } catch (err) {
      setError('Failed to submit text answer or get next question');
    } finally {
      setIsAITyping(false); 
      setLoading(false);
    }
  };

  // Start audio recording using MediaRecorder API
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices) {
        setError('Your browser does not support audio recording (no mediaDevices). Please use Chrome or Firefox.');
        return;
      }
      if (!window.MediaRecorder) {
        setError('Your browser does not support MediaRecorder. Please use Chrome or Firefox.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
      }
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onerror = (event) => {
        setError('MediaRecorder error: ' + event.error.name);
      };

      mediaRecorderRef.current.onstart = () => {
      };
      mediaRecorderRef.current.onstop = async () => {
        setRecordingMessage("");
        let totalSize = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (window.DEBUG_AUDIO_DOWNLOAD) {
          const url = URL.createObjectURL(audioBlob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = 'debug_recorded_audio.webm';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);
        }
        if (audioBlob.size === 0) {
          setError('No audio was recorded. Please try again and speak clearly.');
          return;
        }
        await submitAnswerToTalk(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingMessage("Recording... Speak now!");
    } catch (err) {
      setError('Failed to access microphone: ' + (err.message || err));
      setRecordingMessage("");
      console.error(err);
    }
  };

  // Stop audio recording and trigger upload
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingMessage("");
    }
  };

  // End the interview, fetch feedback and heatmap from backend
  const handleEndInterview = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:8000/end_interview', { method: 'POST' });
      setInterviewEnded(true);
      const feedbackRes = await fastAPIService.getFeedback();
      setFeedback(feedbackRes.data.feedback);
      const heatmapRes = await fastAPIService.getFeedbackHeatmap();
      setHeatmap(heatmapRes.data.heatmap);
    } catch (err) {
      setError('Failed to end interview or fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  // Auto-scroll chat to bottom when messages or typing indicator change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAITyping]);

  return (
    <section className="relative text-gray-400 bg-gray-900 body-font overflow-hidden">
      <div className="container px-6 py-20 mx-auto relative z-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row w-full mb-12 items-start md:items-center">
          <h1 className="text-3xl font-semibold title-font text-white md:w-1/3 mb-4 md:mb-0">
            AI Interview Simulator Highlights
          </h1>
          <p className="md:pl-6 md:w-2/3 text-base text-gray-300 leading-relaxed">
            Dive into snapshots from our immersive mock interviews. Watch AI avatars in action, real-time feedback overlays, confidence heatmaps, and the simulated interview environment designed to sharpen your responses.
          </p>
        </div>

        {/* Image Grid */}
        <div className="flex flex-wrap -m-2 mb-16">
          {/* Left Column */}
          <div className="w-full md:w-1/2 flex flex-wrap">
            { [
              {
                alt: "AI Avatar Interface",
                src: "https://dummyimage.com/500x300/1e40af/ffffff&text=AI+Avatar+View",
              },
              {
                alt: "Candidate Response Analyzer",
                src: "https://dummyimage.com/501x301/1e293b/ffffff&text=Live+Transcript",
              },
              {
                alt: "Interview Questions Panel",
                src: "https://dummyimage.com/600x360/334155/ffffff&text=Question+Panel",
              },
            ].map((img, idx) => (
              <div key={idx} className={`p-2 ${idx === 2 ? "w-full" : "w-1/2"} group`}>
                <img
                  alt={img.alt}
                  src={img.src}
                  className="w-full h-full object-cover object-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-blue-400/40"
                />
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="w-full md:w-1/2 flex flex-wrap">
            { [
              {
                alt: "Feedback Heatmap",
                src: "https://dummyimage.com/601x361/1e293b/ffffff&text=Confidence+Heatmap",
              },
              {
                alt: "Eye Contact Detection",
                src: "https://dummyimage.com/502x302/1e3a8a/ffffff&text=Eye+Contact",
              },
              {
                alt: "Tone & Emotion Feedback",
                src: "https://dummyimage.com/503x303/0369a1/ffffff&text=Tone+Feedback",
              },
            ].map((img, idx) => (
              <div key={idx} className={`p-2 ${idx === 0 ? "w-full" : "w-1/2"} group`}>
                <img
                  alt={img.alt}
                  src={img.src}
                  className="w-full h-full object-cover object-center rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-indigo-400/40"
                />
              </div>
            ))}
          </div>
        </div>

        {/* CTA Button */}
        {!showForm && !interviewStarted && (
          <div className="flex justify-center mb-10 z-20">
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-3 rounded-xl text-lg font-semibold shadow-[0_10px_30px_rgba(99,102,241,0.5)] hover:scale-105 hover:shadow-blue-500/60 transition duration-300 ease-in-out"
            >
              Take an Interview
            </button>
          </div>
        )}

        {/* Glassmorphic Overlay Form */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 transition-all duration-300">
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl text-white p-8 rounded-2xl shadow-2xl relative animate-fadeIn">
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-2xl text-gray-300 hover:text-white"
              >
                &times;
              </button>
              <h2 className="text-2xl font-semibold mb-6 text-center">Interview Setup</h2>
              {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

              <form className="space-y-6">
                {/* Resume Upload */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Upload Resume<span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResume(e.target.files[0])}
                    className="block w-full p-2 text-sm text-white bg-gray-800 rounded-lg border border-gray-600 placeholder-gray-400"
                    required
                  />
                </div>

                {/* Role Input */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Role<span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Choose role (e.g. frontend, backend, etc.)"
                    className="block w-full p-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg placeholder-gray-400"
                    required
                  />
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="block mb-2 text-sm font-medium">Difficulty Level<span className="text-red-500">*</span></label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="block w-full p-2 text-sm bg-gray-800 text-white border border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Choose Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                {/* Start Interview Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleInterviewStart}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 rounded-lg font-semibold shadow-lg hover:scale-105 hover:shadow-indigo-500/50 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Starting...' : 'Start Interview'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Interview Interface */}
        {interviewStarted && !interviewEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 transition-all duration-300">
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl text-white p-8 rounded-2xl shadow-2xl relative animate-fadeIn">
              <h2 className="text-2xl font-semibold mb-6 text-center">Interview in Progress</h2>
              {error && <div className="mb-4 text-center text-red-400">{error}</div>}
              {firstQuestionAudio && !firstQuestionAnswered && (
                <div className="mb-6 text-center text-gray-300 bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-6 rounded-xl shadow-lg border border-blue-700">
                  {/* <p className="text-lg font-medium text-white mb-4">First question: </p> */}
                  <span className="text-white">Let's start with a quick introduction. Please introduce yourself.</span>
                </div>
              )}
              {firstQuestionAnswered && (
                <div className="mb-6" />
              )}
              {/* Chat History + Input */}
              <div className="bg-gray-900 rounded-xl p-4 mb-6 max-h-96 min-h-[24rem] flex flex-col justify-end overflow-y-auto shadow-inner border border-gray-700" style={{height: '24rem'}}>
                <div className="flex-1 overflow-y-auto">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                      <div className={`rounded-lg px-4 py-2 max-w-[75%] text-sm shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-green-200'}`}>
                        <div className="flex items-center mb-1">
                          <span className={`font-bold mr-2 ${msg.role === 'user' ? 'text-white' : 'text-green-300'}`}>{msg.role === 'user' ? 'You' : 'AI'}</span>
                          <span className="text-xs text-gray-400">{msg.time}</span>
                        </div>
                        <span>{msg.content}</span>
                        {/* If AI and audioUrl, show audio player */}
                        {msg.role === 'assistant' && msg.audioUrl && (
                          <audio 
                            src={msg.audioUrl} 
                            controls 
                            controlsList="nodownload"
                            className="mt-2 w-full"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                  {/* AI Typing Indicator */}
                  {isAITyping && (
                    <div className="flex justify-start mb-2">
                      <div className="rounded-lg px-4 py-2 max-w-[75%] text-sm shadow-md bg-gray-700 text-green-200 animate-pulse">
                        <div className="flex items-center mb-1">
                          <span className="font-bold mr-2 text-green-300">AI</span>
                          <span className="text-xs text-gray-400">...</span>
                        </div>
                        <span>
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1 animate-bounce"></span>
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-1 animate-bounce delay-150"></span>
                          <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-bounce delay-300"></span>
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {/* Text Answer Chatbox with Recording Option - now inside chatbox */}
                <div className="flex flex-row items-end mt-4 gap-2 w-full max-w-xl mx-auto">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-600 bg-gray-900 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Type your answer here..."
                    value={textAnswer}
                    onChange={e => setTextAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitTextAnswer(); }}
                    disabled={loading}
                  />
                  <button
                    onClick={submitTextAnswer}
                    className="px-4 py-2 rounded-lg font-semibold shadow-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white transition duration-300"
                    disabled={loading || !textAnswer.trim()}
                  >
                    <span className="hidden sm:inline">Send</span>
                    <svg className="inline w-5 h-5 sm:ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`px-4 py-2 rounded-lg font-semibold shadow-lg transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-900
                      ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                    disabled={loading}
                    title={isRecording ? 'Stop Recording' : 'Start Recording'}
                  >
                    {isRecording ? (
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20"><rect x="6" y="6" width="8" height="8" rx="2"/></svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 15a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a1 1 0 1 1 2 0c0 3.866-3.134 7-7 7s-7-3.134-7-7a1 1 0 1 1 2 0c0 2.757 2.243 5 5 5s5-2.243 5-5z"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleEndInterview}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-bold shadow-xl transition duration-300 text-lg tracking-wide focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                  disabled={loading}
                >
                  End Interview
                </button>
              </div>
            </div>
          </div>
        )}
        {interviewEnded && (
          <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 transition-all duration-300">
            <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl text-white p-8 rounded-2xl shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">Interview Feedback</h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="text-blue-300 text-lg font-semibold">Generating feedback...</div>
                </div>
              ) : feedback ? (
                <div className="bg-gray-900 p-6 rounded-xl shadow-lg border border-green-700 mb-8">
                  {(() => {
                    // Split feedback into sections and highlight headers
                    const lines = feedback.split(/\n+/g).filter(Boolean);
                    return lines.map((line, idx) => {
                      if (/^Confidence:/i.test(line)) return <div key={idx} className="mb-4"><span className="text-green-400 font-bold">{line.slice(0, line.indexOf('-')+1)}</span><span className="text-green-200">{line.slice(line.indexOf('-')+1)}</span></div>;
                      if (/^Tone:/i.test(line)) return <div key={idx} className="mb-4"><span className="text-blue-400 font-bold">{line.slice(0, line.indexOf('-')+1)}</span><span className="text-blue-200">{line.slice(line.indexOf('-')+1)}</span></div>;
                      if (/^Sentiment:/i.test(line)) return <div key={idx} className="mb-4"><span className="text-yellow-400 font-bold">{line.slice(0, line.indexOf('-')+1)}</span><span className="text-yellow-200">{line.slice(line.indexOf('-')+1)}</span></div>;
                      if (/^Accuracy:/i.test(line)) return <div key={idx} className="mb-4"><span className="text-purple-400 font-bold">{line.slice(0, line.indexOf('-')+1)}</span><span className="text-purple-200">{line.slice(line.indexOf('-')+1)}</span></div>;
                      if (/^Overall Summary:/i.test(line)) return <div key={idx} className="mb-6"><span className="text-pink-400 font-bold">Overall Summary:</span><span className="text-pink-200">{line.replace(/^Overall Summary:/i, '')}</span></div>;
                      if (/^Verdict:/i.test(line)) return <div key={idx} className="mb-2 text-center text-2xl font-extrabold tracking-wider"><span className={line.includes('PASS') ? 'text-green-400' : 'text-red-400'}>{line}</span></div>;
                      return <div key={idx} className="text-green-200 text-lg text-center font-mono leading-relaxed mb-2">{line}</div>;
                    });
                  })()}
                </div>
              ) : (
                <div className="text-center text-gray-300">No feedback available.</div>
              )}
              {heatmap && (
                <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-blue-700 mt-4">
                  <h3 className="text-xl font-semibold text-center text-blue-300 mb-4">Vocal Analysis Heatmap</h3>
                  <div className="flex flex-wrap justify-center gap-4">
                    {heatmap.map((item, idx) => {
                      let bg = 'bg-yellow-500 text-black';
                      if (item.sentiment === 'POSITIVE') bg = 'bg-green-600 text-white';
                      else if (item.sentiment === 'NEGATIVE') bg = 'bg-red-600 text-white';
                      // Confidence as opacity (min 0.4, max 1)
                      const opacity = item.confidence !== null ? Math.max(0.4, item.confidence) : 0.4;
                      return (
                        <div key={idx} className={`flex flex-col items-center rounded-lg p-4 min-w-[120px] ${bg}`} style={{ opacity }}>
                          <span className="text-sm text-gray-200 mb-1">Answer {item.answer}</span>
                          <span className="text-lg font-bold">{item.confidence !== null ? (item.confidence * 100).toFixed(0) + '%' : 'N/A'}</span>
                          <span className="mt-1 px-2 py-1 rounded text-xs font-semibold">{item.sentiment || 'N/A'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex justify-center mt-8">
                <button
                  onClick={() => {
                    setInterviewEnded(false);
                    setInterviewStarted(false);
                    setMessages([]);
                    setFeedback(null);
                    setHeatmap(null);
                    setFirstQuestionAnswered(false);
                    setFirstQuestionAudio(null);
                    setTextAnswer("");
                    setShowForm(false);
                  }}
                  className="bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black text-white px-8 py-3 rounded-xl font-bold shadow-xl transition duration-300 text-lg tracking-wide focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-900"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default TechnicalInterview;

