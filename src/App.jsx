import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { casosClinicos } from './casos';
import './App.css';

// Hook para hacer el debounce del autoguardado
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

function App() {
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [responses, setResponses] = useState({});

  const debouncedResponses = useDebounce(responses, 1500);

  const [errorMsg, setErrorMsg] = useState(null);

  // Cargar o crear sesión de grupo
  const handleSelectGroup = async (groupId) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const docRef = doc(db, 'sessions', `grupo_${groupId}`);
      const myCase = casosClinicos.find(c => c.id === parseInt(groupId));

      // Agregar un timeout de 8 segundos por si Firebase es bloqueado
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firebase no responde. Posiblemente un bloqueador de anuncios (AdBlock/Brave) o fallo de red está bloqueando la conexión.")), 8000)
      );

      const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setSession(data);
        setCurrentLevel(data.currentLevel || 1);
        setResponses(data.responses || {});
      } else {
        const newSession = {
          groupId,
          caseData: myCase,
          currentLevel: 1,
          status: 'in_progress',
          responses: { level1: '', level2: '', level3: '', level4: '' },
          lastUpdated: new Date()
        };
        await Promise.race([setDoc(docRef, newSession), timeoutPromise]);
        setSession(newSession);
        setResponses(newSession.responses);
      }
      setSelectedGroup(groupId);
    } catch (error) {
      console.error("Error al Firebase:", error);
      setErrorMsg(error.message || "Error desconocido al conectar con la base de datos");
    } finally {
      setLoading(false);
    }
  };

  // Autoguardado
  useEffect(() => {
    if (selectedGroup && session && Object.keys(debouncedResponses).length > 0) {
      const saveToFirebase = async () => {
        const docRef = doc(db, 'sessions', `grupo_${selectedGroup}`);
        await updateDoc(docRef, {
          responses: debouncedResponses,
          currentLevel,
          lastUpdated: new Date()
        });
      };
      saveToFirebase();
    }
  }, [debouncedResponses, currentLevel, selectedGroup]);

  const handleNextLevel = () => {
    if (currentLevel < 4) setCurrentLevel(prev => prev + 1);
  };
  const handlePrevLevel = () => {
    if (currentLevel > 1) setCurrentLevel(prev => prev - 1);
  };

  const handleFinish = async () => {
    const docRef = doc(db, 'sessions', `grupo_${selectedGroup}`);
    await updateDoc(docRef, { status: 'completed' });
    setSession({ ...session, status: 'completed' });
  };

  if (!selectedGroup) {
    return (
      <div className="container start-screen">
        <header>
          <h1>Integración Clínico-Anatómica</h1>
          <h3>Patologías de la Médula Espinal</h3>
        </header>
        <div className="group-selection">
          <p>Selecciona tu equipo de trabajo para comenzar:</p>
          <div className="grid">
            {casosClinicos.map(c => (
              <button key={c.id} onClick={() => handleSelectGroup(c.id)} className="btn-group">
                {c.grupo}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Cargando caso clínico...</div>;
  if (errorMsg) return (
    <div className="container start-screen">
      <div style={{ color: 'red', marginTop: '2rem', padding: '1rem', border: '1px solid red' }}>
        <h3>Error de Conexión a Base de Datos:</h3>
        <p>{errorMsg}</p>
        <button onClick={() => setErrorMsg(null)} className="btn-secondary">Volver</button>
      </div>
    </div>
  );

  return (
    <div className="container app-screen">
      <header className="app-header">
        <div className="header-info">
          <h2>{session.caseData.grupo}</h2>
          <span className={`status-badge ${session.status}`}>{session.status === 'completed' ? 'Completado' : 'En Progreso'}</span>
        </div>
        <button className="btn-secondary" onClick={() => setSelectedGroup(null)}>Volver al Inicio</button>
      </header>

      <section className="case-description panel">
        <h3>📜 Caso Clínico Asignado</h3>
        <p><strong>Topografía General:</strong> {session.caseData.topografia}</p>
        <p className="description-text">{session.caseData.descripcion}</p>
        <div className="hint">💡 <strong>Pista del Docente:</strong> {session.caseData.pista}</div>
      </section>

      <div className="levels-wrapper">
        <div className="tabs">
          {[1, 2, 3, 4].map(num => (
            <button key={num} className={`tab ${currentLevel === num ? 'active' : ''} ${currentLevel > num ? 'completed' : ''}`} onClick={() => setCurrentLevel(num)}>
              Nivel {num}
            </button>
          ))}
        </div>

        <section className="level-content panel">
          {currentLevel === 1 && (
            <div>
              <h3>Nivel 1: Anatomía Osteoarticular</h3>
              <p>Identifica los huesos y ligamentos potencialmente afectados en el nivel analizado. ¿Qué mecanismo lo causó?</p>
              <textarea
                placeholder="Escribe aquí tu análisis anatómico óseo y ligamentario..."
                value={responses.level1 || ''}
                onChange={e => setResponses({ ...responses, level1: e.target.value })}
                disabled={session.status === 'completed'}
              />
            </div>
          )}
          {currentLevel === 2 && (
            <div>
              <h3>Nivel 2: Meninges y Topografía Medular</h3>
              <p>Relaciona la lesión ósea con el contenido dentro del canal (Médula o Cauda Equina). Identifica posibles daños meníngeos o vasculares.</p>
              <textarea
                placeholder="Escribe tu análisis sobre meninges, espacios y relación vértebra-médula..."
                value={responses.level2 || ''}
                onChange={e => setResponses({ ...responses, level2: e.target.value })}
                disabled={session.status === 'completed'}
              />
            </div>
          )}
          {currentLevel === 3 && (
            <div>
              <h3>Nivel 3: Neuroanatomía Interna y Tractos</h3>
              <p>Menciona qué fascículos, cordones de sustancia blanca o astas grises sufren daño primario según tu caso.</p>
              <textarea
                placeholder="Ejemplo: Afectación de los tractos corticoespinales laterales..."
                value={responses.level3 || ''}
                onChange={e => setResponses({ ...responses, level3: e.target.value })}
                disabled={session.status === 'completed'}
              />
            </div>
          )}
          {currentLevel === 4 && (
            <div>
              <h3>Nivel 4: Integración Clínica Final</h3>
              <p>Explica sintomatológicamente qué va a presentar el paciente (pérdida ipsilateral o contralateral, motora o sensitiva) como se indica en el caso, utilizando las bases anatómicas descritas.</p>
              <textarea
                placeholder="Descripción integral de la sintomatología y conclusión..."
                value={responses.level4 || ''}
                onChange={e => setResponses({ ...responses, level4: e.target.value })}
                disabled={session.status === 'completed'}
              />
            </div>
          )}

          <div className="level-controls">
            <button disabled={currentLevel === 1} onClick={handlePrevLevel} className="btn-secondary">Atrás</button>
            <span className="save-status">{session.status === 'completed' ? 'Respuestas bloqueadas' : 'Guardado automático activo ✓'}</span>
            {currentLevel < 4 ? (
              <button className="btn-primary" onClick={handleNextLevel}>Siguiente Nivel</button>
            ) : (
              <button className="btn-success" onClick={handleFinish} disabled={session.status === 'completed'}>
                {session.status === 'completed' ? 'Trabajo Enviado' : 'Finalizar y Enviar'}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
