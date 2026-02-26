import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import './App.css';

function Dashboard() {
    const [sessions, setSessions] = useState([]);
    const [expandedGroup, setExpandedGroup] = useState(null);

    useEffect(() => {
        const q = query(collection(db, 'sessions'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort numerically
            docs.sort((a, b) => parseInt(a.groupId) - parseInt(b.groupId));
            setSessions(docs);
        });

        return () => unsubscribe();
    }, []);

    const toggleGroup = (groupId) => {
        if (expandedGroup === groupId) setExpandedGroup(null);
        else setExpandedGroup(groupId);
    };

    const handleGradeChange = async (sessionId, level, value) => {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
            [`grades.${level}`]: parseInt(value)
        });
    };

    const handleFeedbackChange = async (sessionId, value) => {
        const sessionRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionRef, {
            feedback: value
        });
    };

    const calculateTotalGrade = (grades) => {
        if (!grades) return '0.0';
        const totalPoints = (grades.level1 || 0) + (grades.level2 || 0) + (grades.level3 || 0) + (grades.level4 || 0);
        const maxPoints = 12; // 4 levels * 3 points each
        const finalGrade = (totalPoints / maxPoints) * 5.0;
        return finalGrade.toFixed(1);
    };

    return (
        <div className="container dashboard">
            <header className="app-header">
                <div className="header-info">
                    <h2>👨‍🏫 Panel del Docente</h2>
                    <span className="live-badge">🔴 En Vivo</span>
                </div>
                <Link to="/" className="btn-secondary">Ir a Vista Estudiante</Link>
            </header>

            <div className="dashboard-grid">
                {sessions.map(session => (
                    <div key={session.id} className={`group-card ${session.status}`}>
                        <div className="card-header" onClick={() => toggleGroup(session.groupId)}>
                            <h3>{session.caseData.grupo}</h3>
                            <div className="status-indicators">
                                <span className="level-badge">Nivel {session.currentLevel || 1}</span>
                                <span className={`status-dot ${session.status}`}></span>
                            </div>
                        </div>

                        {expandedGroup === session.groupId && (
                            <div className="card-body">
                                <div className="case-details">
                                    <p><strong>Topografía:</strong> {session.caseData.topografia}</p>
                                    <p><strong>Descripción:</strong> {session.caseData.descripcion}</p>
                                    <p><strong>Pista:</strong> {session.caseData.pista}</p>
                                </div>
                                <hr />
                                {[1, 2, 3, 4].map((levelNum) => (
                                    <div key={levelNum} className="response-group">
                                        <h4>Nivel {levelNum}:</h4>
                                        <p>{session.responses?.[`level${levelNum}`] || <span className="empty">Sin respuesta...</span>}</p>
                                        <div className="rubric-control">
                                            <label>Calificación (0-3): </label>
                                            <select 
                                                value={session.grades?.[`level${levelNum}`] ?? ''} 
                                                onChange={(e) => handleGradeChange(session.id, `level${levelNum}`, e.target.value)}
                                            >
                                                <option value="" disabled>Seleccione puntaje</option>
                                                <option value="0">0 Puntos - Insuficiente</option>
                                                <option value="1">1 Punto - Regular</option>
                                                <option value="2">2 Puntos - Bueno</option>
                                                <option value="3">3 Puntos - Excelente</option>
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                <hr />
                                <div className="feedback-section">
                                    <div className="grade-display">
                                        <h3>Nota Final: {calculateTotalGrade(session.grades)} / 5.0</h3>
                                    </div>
                                    <h4>Comentarios y Realimentación (Opcional):</h4>
                                    <textarea 
                                        placeholder="Escribe comentarios o feedback para el grupo..." 
                                        value={session.feedback || ''}
                                        onChange={(e) => handleFeedbackChange(session.id, e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {sessions.length === 0 && (
                    <div className="empty-state">Ningún grupo ha iniciado la actividad todavía.</div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
