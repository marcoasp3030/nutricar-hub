
const API_URL = `https://${process.env.SUPABASE_PROJECT_ID}.supabase.co/functions/v1/tv-api`;
const API_KEY = '2fc53f6cfc212425912f309210b3e312842d33e46e59d9bcd22ddedcdf248fba';
const UNIT_ID = 'bc5d0742-cbc4-4a99-a439-63a4d878749b';

const headers = {
  'x-api-key': API_KEY,
  'x-unit-id': UNIT_ID,
  'Content-Type': 'application/json'
};

async function testEndpoint(name, path, method = 'GET', body = null) {
  console.log(`\n--- Testando ${name} (${method} ${path}) ---`);
  try {
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json();
    
    console.log(`Status: ${response.status}`);
    if (response.ok) {
      console.log('✅ Sucesso!');
      console.log('Resposta:', JSON.stringify(data).slice(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''));
      return data;
    } else {
      console.log('❌ Erro:', data);
    }
  } catch (error) {
    console.log('💥 Erro na requisição:', error.message);
  }
}

async function runTests() {
  // 1. Get Config
  await testEndpoint('Configuração', '/config');
  
  // 2. Get Playlist
  await testEndpoint('Playlist', '/playlist');
  
  // 3. Heartbeat
  await testEndpoint('Heartbeat', '/heartbeat', 'POST', { metrics: { cpu: 10, memory: 512 } });
  
  // 4. Get Commands
  const commandsData = await testEndpoint('Comandos', '/commands');
  
  // 5. Ack Command (if any)
  if (commandsData && commandsData.commands && commandsData.commands.length > 0) {
    const cmdId = commandsData.commands[0].id;
    await testEndpoint('Ack Comando', '/commands/ack', 'POST', { command_id: cmdId });
  }
  
  // 6. Send Logs
  await testEndpoint('Logs', '/logs', 'POST', { 
    logs: [{ level: 'info', event: 'test_script', details: { message: 'Script de teste executado' } }] 
  });
}

runTests();
