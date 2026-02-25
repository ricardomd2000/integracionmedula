import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
                                <p><strong>Topografía:</strong> {session.caseData.topografia}</p>
                                <hr />
                                <div className="response-group">
                                    <h4>Nivel 1:</h4>
                                    <p>{session.responses?.level1 || <span className="empty">Sin respuesta...</span>}</p>
                                </div>
                                <div className="response-group">
                                    <h4>Nivel 2:</h4>
                                    <p>{session.responses?.level2 || <span className="empty">Sin respuesta...</span>}</p>
                                </div>
                                <div className="response-group">
                                    <h4>Nivel 3:</h4>
                                    <p>{session.responses?.level3 || <span className="empty">Sin respuesta...</span>}</p>
                                </div>
                                <div className="response-group">
                                    <h4>Nivel 4:</h4>
                                    <p>{session.responses?.level4 || <span className="empty">Sin respuesta...</span>}</p>
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
