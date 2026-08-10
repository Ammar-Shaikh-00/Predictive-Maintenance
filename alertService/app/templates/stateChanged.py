from datetime import datetime

def build_email_template(previous_state, current_state,frontend_url):
    timestamp = datetime.utcnow().strftime("%d. %B %Y – %H:%M UTC")

    subject = "Maschinenstatus – Zustandsänderung – Extruder-SQL"

    body = f"""
Maschinenstatus – Zustandsänderung <br/>
<br/>
Maschine: Extruder-SQL<br/>
<br/>
Statusänderung<br/>
Die Maschine hat ihren Zustand geändert.<br/>
<br/>
Vorheriger Zustand: {previous_state}<br/>
Aktueller Zustand: {current_state}<br/>
<br/>
Zeitpunkt der Änderung:<br/>
{timestamp}<br/>
<br/>
Bedeutung<br/>
Das System hat anhand der Prozessdaten (z. B. Schneckendrehzahl, Druck und Temperatur) eine Zustandsänderung der Anlage erkannt.<br/>
<br/>
Sie können die aktuellen Zustände und Prozessdaten im Dashboard einsehen.<br/>
<br/>
Dashboard-Zugriff:<br/>
{frontend_url}/<br/>
<br/>
Diese Benachrichtigung wurde automatisch von der Predictive-Maintenance-Plattform generiert.<br/>
"""

    return subject, body