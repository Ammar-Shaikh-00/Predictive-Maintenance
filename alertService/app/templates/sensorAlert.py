from datetime import datetime

def build_email_template(sensor, value, min_val, max_val, condition, machine_state):
    timestamp = datetime.utcnow().strftime("%d. %B %Y – %H:%M UTC")

    subject = "Sensor Alarm – Grenzwertüberschreitung – Extruder-SQL"

    body = f"""
Sensor Alarm – Grenzwertüberschreitung<br/>
<br/>
Maschine: Extruder-SQL<br/>
<br/>
Alarmdetails<br/>
Eine Grenzwertverletzung wurde im System erkannt.<br/>
<br/>
Sensor: {sensor}<br/>
Aktueller Wert: {value}<br/>
Bedingung: {condition}<br/>
Erlaubter Bereich: {min_val} - {max_val}<br/>
Maschinenzustand: {machine_state}<br/>
<br/>
Zeitpunkt der Erkennung:<br/>
{timestamp}<br/>
<br/>
Bedeutung<br/>
Der aktuelle Sensorwert liegt außerhalb des definierten Grenzbereichs. <br/>
Dies kann auf ein mögliches Problem im Prozess oder in der Maschine hinweisen. <br/>
<br/>
Empfohlene Maßnahme <br/>
Bitte überprüfen Sie die Anlage umgehend, um mögliche Schäden oder Produktionsausfälle zu vermeiden.<br/>

Dashboard-Zugriff:<br/>
http://100.119.197.81:3000/<br/>

Diese Benachrichtigung wurde automatisch von der CYBRAIN AI Predictive-Maintenance-Plattform generiert.<br/>
"""

    return subject, body