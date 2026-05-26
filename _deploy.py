import paramiko

hk='64.90.4.219'; pw='ZnEGqMXjIRI8m0XZ'
s=paramiko.SSHClient(); s.set_missing_host_key_policy(paramiko.AutoAddPolicy())
s.connect(hk,username='root',password=pw,timeout=25,banner_timeout=25,auth_timeout=25)

# Simulate the backend parsing to see what SSE events it would emit
stdin,stdout,stderr=s.exec_command("""
echo '=== 1. Parse simulation ==='
node -e "
// Simulate the chat route.js parser logic
let fullReply=''; let fullReasoning=''; let startedAnswer=false;
let reasoningOut=''; let contentOut='';
const chunks = [
  { choices: [{ delta: { reasoning_content: 'Got' } }] },
  { choices: [{ delta: { reasoning_content: ' it. ' } }] },
  { choices: [{ delta: { content: 'Hello!' } }] },
];
for (const json of chunks) {
  const delta = json.choices[0].delta;
  if (!delta) continue;
  if (delta.reasoning_content && !startedAnswer) {
    fullReasoning += delta.reasoning_content;
    reasoningOut += 'R:' + delta.reasoning_content;
  }
  if (delta.content) {
    if (!startedAnswer) {
      startedAnswer = true;
      if (fullReasoning) reasoningOut += ' [DONE:' + fullReasoning + ']';
    }
    fullReply += delta.content;
    contentOut += 'C:' + delta.content;
  }
}
console.log('Reasoning:', fullReasoning);
console.log('Reply:', fullReply);
console.log('Events:', reasoningOut, contentOut);
"
""",timeout=10)
print(stdout.read().decode('utf-8','replace')[:500])
s.close()
