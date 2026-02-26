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
        const totalPoints = (grades.level1 || 0) + (grades.level2 || 0) + (grades.level3 || 0) + (grades.level4 || 0) + (grades.authenticity || 0);
        const maxPoints = 15; // 4 levels + 1 authenticity criterion * 3 points each
        const finalGrade = (totalPoints / maxPoints) * 5.0;
        return finalGrade.toFixed(1);
    };

    // Textos descriptivos para la rúbrica de cada nivel basados en la guía
    const rubricDescriptions = {
        level1: [
            { value: "0", label: "0 Puntos - No identifica huesos/ligamentos ni mecanismo de lesión." },
            { value: "1", label: "1 Punto - Identifica parcialmente huesos o el mecanismo." },
            { value: "2", label: "2 Puntos - Identifica huesos/ligamentos y mecanismo con imprecisiones." },
            { value: "3", label: "3 Puntos - Excelente, describe correctamente estructuras osteoarticulares y mecanismo exacto." }
        ],
        level2: [
            { value: "0", label: "0 Puntos - No relaciona la lesión con el canal ni identifica daños meníngeos." },
            { value: "1", label: "1 Punto - Relaciona vagamente la lesión ósea o menciona meninges aisladas." },
            { value: "2", label: "2 Puntos - Relaciona lesión con el canal, falla en detalles meníngeos/vasculares." },
            { value: "3", label: "3 Puntos - Excelente, caracteriza relación vértebra-médula e identifica daño meníngeo." }
        ],
        level3: [
            { value: "0", label: "0 Puntos - No reconoce vías medulares o astas afectadas." },
            { value: "1", label: "1 Punto - Menciona tractos o astas de forma incorrecta para su nivel." },
            { value: "2", label: "2 Puntos - Reconoce vías/astas dañadas, pero omite organización anatómica." },
            { value: "3", label: "3 Puntos - Excelente, identifica precisión de sustancia gris/blanca, cordones y fascículos dañados." }
        ],
        level4: [
            { value: "0", label: "0 Puntos - No explica sintomatología o no correlaciona con anatomía." },
            { value: "1", label: "1 Punto - Menciona síntomas genéricos sin lateralidad correcta." },
            { value: "2", label: "2 Puntos - Explica sintomatología con lateralidad, justificación anatómica débil." },
            { value: "3", label: "3 Puntos - Excelente, integración perfecta (termoanalgésica/motora/epicrítica ipsi/contra)." }
        ],
        authenticity: [
            { value: "0", label: "0 Puntos - Evidencia clara de uso de IA o copia externa sin lenguaje propio." },
            { value: "1", label: "1 Punto - Lenguaje mayormente externo con mínima adaptación propia." },
            { value: "2", label: "2 Puntos - Lenguaje propio adecuado, alguna estructura artificial." },
            { value: "3", label: "3 Puntos - Excelente, lenguaje auténtico, claro y propio del estudiante." }
        ]
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
                                        <div className="rubric-control detailed-rubric">
                                            <label>Calificación (0-3): </label>
                                            <select
                                                value={session.grades?.[`level${levelNum}`] ?? ''}
                                                onChange={(e) => handleGradeChange(session.id, `level${levelNum}`, e.target.value)}
                                            >
                                                <option value="" disabled>Seleccione puntaje basado en los objetivos</option>
                                                {rubricDescriptions[`level${levelNum}`].map(option => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                <div className="response-group authenticity-group">
                                    <h4>Criterio de Probidad Académica</h4>
                                    <p className="authenticity-desc">Evalúa si el texto presenta originalidad, apropiación de la guía de estudio y ausencia del uso injustificado de herramientas de inteligencia artificial.</p>
                                    <div className="rubric-control detailed-rubric">
                                        <label>Lenguaje Propio (0-3): </label>
                                        <select
                                            value={session.grades?.authenticity ?? ''}
                                            onChange={(e) => handleGradeChange(session.id, 'authenticity', e.target.value)}
                                        >
                                            <option value="" disabled>Evaluar autenticidad del lenguaje</option>
                                            {rubricDescriptions.authenticity.map(option => (
                                                <option key={option.value} value={option.value}>{option.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

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
