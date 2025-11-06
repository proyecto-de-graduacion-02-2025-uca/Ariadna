import { handleCompileRequest } from './index';

const request = {
  sourceCode: `
    #include <iostream>
    using namespace std;

    int main() {
      cout << "Hola desde docker!" << endl;
      return 0;
    }
  `,
  flags: ['-O2', '-std=gnu++17', '-pipe'],
  sessionId: 'test-session-001'
};

handleCompileRequest(request).then(result => {
  console.log('Resultado de compilación:', result);
}).catch(err => {
  console.error('Error al compilar:', err);
});