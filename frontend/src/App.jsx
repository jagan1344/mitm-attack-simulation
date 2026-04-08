import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './index.css'

function App() {
  const [message, setMessage] = useState('')
  const [simulationSteps, setSimulationSteps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [attackMode, setAttackMode] = useState('random') // random, force_attack, force_safe
  const [logs, setLogs] = useState([])
  const terminalRef = useRef(null)

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, { text, type, time: new Date().toLocaleTimeString() }])
  }

  const runSimulation = async (msg = message, currentMode = attackMode) => {
    if (!msg) return
    setLoading(true)
    setSimulationSteps(null)
    
    // Clear logs if it's a new user interaction, but keep them if it's an auto-retry
    if (currentMode !== 'force_safe_retry') {
      setLogs([])
      addLog('> INIT: Establishing secure connection...', 'info')
    } else {
      addLog('> RETRY: Automatic secure channel fallback initiated...', 'warning')
      currentMode = 'force_safe' // map back to backend spec
    }

    try {
      addLog('> ACTION: Encrypting payload via AES-256', 'info')
      addLog('> ACTION: Exchanging keys via RSA-2048', 'info')

      const response = await axios.post('/simulate', {
        message: msg,
        attack_mode: currentMode
      })
      
      setTimeout(() => {
        setSimulationSteps(response.data)

        if (response.data.attack_status === 'ATTACKED') {
          addLog('> ALERT: Network packet interception detected!', 'danger')
          addLog('> ALERT: Ciphertext tampering detected at MITM layer.', 'danger')
        } else {
          addLog('> NETWORK: Packet forwarded through untrusted node safely.', 'success')
        }

        if (response.data.final_status === 'ATTACK DETECTED') {
          addLog('> VERIFY: RSA Signature verification FAILED.', 'danger')
          addLog('> SYSTEM: Connection terminated. Payload rejected.', 'danger')
          addLog('> AUTO: Initiating retry protocol in 3s...', 'warning')
          
          setTimeout(() => {
            runSimulation(msg, 'force_safe_retry')
          }, 3000)
        } else {
          addLog('> VERIFY: RSA Digital Signature matched successfully.', 'success')
          addLog('> SYSTEM: Secure delivery confirmed.', 'success')
        }
      }, 800) // Slight artificial delay for dramatic effect

    } catch (error) {
      addLog('> ERROR: Failed to connect to server.', 'danger')
      console.error("Simulation failed", error)
    } finally {
      setTimeout(() => setLoading(false), 800)
    }
  }

  const handleSend = (e) => {
    e.preventDefault()
    runSimulation(message, attackMode)
  }

  return (
    <div className="layout-container">
      <div className="main-content glass-panel">
        <div className="header">
          <h1>Secure Comm Simulation</h1>
          <p>AES Encryption • RSA Key Exchange • Digital Signatures</p>
        </div>

        <div className="controls">
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${attackMode === 'random' ? 'active' : ''}`}
              onClick={() => setAttackMode('random')}
              type="button"
            >
              Random Attack
            </button>
            <button 
              className={`toggle-btn ${attackMode === 'force_attack' ? 'active' : ''}`}
              onClick={() => setAttackMode('force_attack')}
              type="button"
            >
              Force Attack
            </button>
            <button 
              className={`toggle-btn ${attackMode === 'force_safe' ? 'active' : ''}`}
              onClick={() => setAttackMode('force_safe')}
              type="button"
            >
              Force Safe
            </button>
          </div>
        </div>

        <form onSubmit={handleSend}>
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter Message to secure..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading && (!simulationSteps || simulationSteps.final_status !== 'ATTACK DETECTED')}
            />
            <button 
              type="submit" 
              disabled={loading && (!simulationSteps || simulationSteps.final_status !== 'ATTACK DETECTED')}
            >
              {loading ? 'Processing...' : 'Send securely'}
            </button>
          </div>
        </form>

        {simulationSteps && (
          <div className="simulation-grid">
            <div className="step-card" style={{ animationDelay: '0.1s' }}>
              <div className="step-header">
                1. Original Message
              </div>
              <p className="step-value">{simulationSteps.original_message}</p>
            </div>

            <div className="step-card" style={{ animationDelay: '0.3s' }}>
              <div className="step-header">
                2. AES Encrypted & RSA Signed
              </div>
              <p className="step-value" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {simulationSteps.encrypted_message.substring(0, 40)}...
              </p>
            </div>

            <div className={`step-card ${simulationSteps.attack_status === 'ATTACKED' ? 'danger' : 'success'}`} style={{ animationDelay: '0.6s' }}>
              <div className="step-header">
                3. Attacker View (MITM Layer)
                <span className={`status-badge ${simulationSteps.attack_status === 'ATTACKED' ? 'badge-danger' : 'badge-success'}`}>
                  {simulationSteps.attack_status}
                </span>
              </div>
              <p className="step-value" style={{ fontSize: '0.9rem' }}>
                {simulationSteps.attacker_view.substring(0, 40)}...
              </p>
            </div>

            <div className={`step-card ${simulationSteps.final_status === 'ATTACK DETECTED' ? 'danger' : 'success'}`} style={{ animationDelay: '0.9s' }}>
              <div className="step-header">
                4. Server Verification
                <span className={`status-badge ${simulationSteps.final_status === 'ATTACK DETECTED' ? 'badge-danger' : 'badge-success'}`}>
                  {simulationSteps.final_status}
                </span>
              </div>
              <p className="step-value">
                {simulationSteps.decrypted_message === 'FAILED' ? (
                  <span style={{ color: 'var(--danger)' }}>Crypto Verification FAILED (Tempered Data)</span>
                ) : (
                  <span style={{ color: 'var(--success)' }}>{simulationSteps.decrypted_message}</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="terminal-panel glass-panel">
        <div className="terminal-header">
          <div className="terminal-dots">
            <span className="dot dot-r"></span>
            <span className="dot dot-y"></span>
            <span className="dot dot-g"></span>
          </div>
          <span className="terminal-title">System Execution Logs</span>
        </div>
        <div className="terminal-body" ref={terminalRef}>
          {logs.length === 0 && (
             <div className="log-line log-info">System ready. Waiting for transmission...</div>
          )}
          {logs.map((log, index) => (
            <div key={index} className={`log-line log-${log.type}`}>
              <span className="log-time">[{log.time}]</span> {log.text}
            </div>
          ))}
          {loading && <div className="log-line log-info blink">_</div>}
        </div>
      </div>
    </div>
  )
}

export default App
