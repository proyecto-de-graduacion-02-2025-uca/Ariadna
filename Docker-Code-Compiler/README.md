# 🐳 Compilación de Código C++ en un Contenedor Docker

Se tiliza un contenedor Docker para compilar y ejecutar programas escritos en C++ de forma aislada, sin necesidad de instalar compiladores en el sistema operativo del host.


## 📦 Dockerfile

El contenedor se construye a partir de la imagen base de Ubuntu 22.04. El `Dockerfile` realiza las siguientes acciones:

1. **Establece Ubuntu 22.04 como base**
2. **Evita interacciones manuales** durante la instalación de paquetes (`DEBIAN_FRONTEND=noninteractive`)
3. **Instala herramientas necesarias para compilar C++**, como `g++` y `build-essential`
4. **Crea un directorio de trabajo `/app`** dentro del contenedor
5. **Copia todos los archivos del proyecto** al contenedor
6. Establece un comando por defecto (`g++ --version`) si no se especifica otro

## 🔁 Flujo de uso paso a paso

A continuación se detalla el flujo completo para compilar y ejecutar un programa C++ (`main.cpp`) usando Docker.

### 1️⃣ Construir la imagen Docker

Primero, crea la imagen base con `g++` preinstalado a partir del `Dockerfile`.

```powershell
docker build -t cpp-app .
```

Esto crea una imagen llamada cpp-app basada en Ubuntu 22.04 con las herramientas necesarias para compilar C++.

### 2️⃣ Compilar el archivo main.cpp

Comando para uso en `Powershell`
```powershell
docker run --rm -v "${PWD}:/app" cpp-app g++ main.cpp -o main
```

Comando para uso en `Cmd`
```powershell
docker run --rm -v "%cd%:/app" cpp-app g++ main.cpp -o main
```

💡 NOTA: Si hay errores de compilación, se mostrarán directamente en la consola.

### 3️⃣ Ejecutar el programa compilado

El siguiente comando ejecuta el binario `main` dentro de un contenedor de Ubunto
```powershell
docker run --rm -v "${PWD}:/app" -w /app ubuntu:22.04 ./main
```

## 4️⃣ Estructura

La carpeta desde donde se ejecutan los comandos debe contener al menos los siguientes archivos:

```
/root
├── Dockerfile
└── main.cpp
```

## 🛠️ Requisitos

- Docker Desktop instalado
- Consola compatible: PowerShell o CMD.
- Consola compatible opcionales: Git bash, Wsl, terminal linux, etc.