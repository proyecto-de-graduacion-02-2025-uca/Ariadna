import { compileCpp } from './index';

const request = {
  sessionId: 'test-session-001',
  source: `
    #include <iostream>
    using namespace std;

    int main() {
      cout << "Hola desde docker!" << endl;
      return 0;
    }
  `,
  flags: ['-std=gnu++17', '-O2', '-pipe'],
};

compileCpp(request)
  .then((result) => {
    console.log('Resultado de compilación:', result);
  })
  .catch((err) => {
    console.error('Error al compilar:', err);
  });
