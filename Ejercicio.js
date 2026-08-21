const libro = {
  titulo: "Cien años de soledad",
  autor: "Gabriel García Márquez",
  añoDePublicacion: 1967
};
console.log(libro.titulo);
console.log(libro.autor);
console.log(libro.añoDePublicacion);

const estudiante = {
  nombre: "Ana",
  edad: 21,
  direccion: {
    calle: "Av. San Martín 450",
    ciudad: "Concepción del Uruguay",
    pais: "Argentina"
  }
};
console.log(`${estudiante.direccion.calle}, ${estudiante.direccion.ciudad}, ${estudiante.direccion.pais}`);

const libroConMetodo = {
  titulo: "Rayuela",
  autor: "Julio Cortázar",
  añoDePublicacion: 1963,
  descripcion() {
    return `"${this.titulo}" fue escrito por ${this.autor}.`;
  }
};
console.log(libroConMetodo.descripcion());

const producto = {
  nombre: "Monitor 24''",
  precio: 150000,
  disponible: true
};
for (const propiedad in producto) {
  console.log(`${propiedad}: ${producto[propiedad]}`);
}

producto.precio = 135000;
console.log(producto);

function tienePropiedad(objeto, nombrePropiedad) {
  return Object.hasOwn(objeto, nombrePropiedad);
}
console.log(tienePropiedad(producto, "nombre"));
console.log(tienePropiedad(producto, "stock"));

console.log(producto);
delete producto.disponible;
console.log(producto);

const persona1 = { nombre: "Carlos", edad: 30 };
const persona2 = { ciudad: "Paraná", profesion: "Desarrollador" };
const personaCombinada = Object.assign({}, persona1, persona2);
console.log(personaCombinada);

const copiaEstudiante = JSON.parse(JSON.stringify(estudiante));
copiaEstudiante.direccion.ciudad = "Colón";
console.log(estudiante.direccion.ciudad);
console.log(copiaEstudiante.direccion.ciudad);

const libroConGetSet = {
  titulo: "Ficciones",
  autor: "Jorge Luis Borges",
  _añoDePublicacion: 1944,
  get añoDePublicacion() {
    return this._añoDePublicacion;
  },
  set añoDePublicacion(nuevoAño) {
    if (typeof nuevoAño === "number" && nuevoAño > 0) {
      this._añoDePublicacion = nuevoAño;
    }
  }
};
libroConGetSet.añoDePublicacion = 1956;
console.log(libroConGetSet.añoDePublicacion);

function sumar(a, b) {
  return a + b;
}
console.log(sumar(5, 3));

function multiplicar(a, b) {
  return a * b;
}
console.log(multiplicar(4, 6));

function saludar(nombre = "Invitado") {
  return `Hola, ${nombre}`;
}
console.log(saludar());
console.log(saludar("Lucas"));

function crearPersona(nombre, edad) {
  return { nombre, edad };
}
console.log(crearPersona("Martina", 25));

function actualizarEdad(persona, nuevaEdad) {
  persona.edad = nuevaEdad;
  return persona;
}
const usuario = { nombre: "Pedro", edad: 20 };
actualizarEdad(usuario, 21);
console.log(usuario);

function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
console.log(factorial(5));

function despedir() {
  function adios() {
    return "¡Hasta luego!";
  }
  return adios();
}
console.log(despedir());

function procesarArray(array, fn) {
  const resultado = [];
  for (const elemento of array) {
    resultado.push(fn(elemento));
  }
  return resultado;
}
const numerosBase = [1, 2, 3, 4];
console.log(procesarArray(numerosBase, (num) => num * 2));

function crearMultiplicador(x) {
  return function (numero) {
    return numero * x;
  };
}
const triplicar = crearMultiplicador(3);
console.log(triplicar(5));

const sumarAnonima = function (a, b) {
  return a + b;
};
console.log(sumarAnonima(10, 20));

async function obtenerUsuarios() {
  try {
    const respuesta = await fetch("https://jsonplaceholder.typicode.com/users");
    const usuarios = await respuesta.json();
    console.log(usuarios);
    return usuarios;
  } catch (error) {
    console.error(error);
  }
}

async function imprimirNombresDeUsuarios() {
  const usuarios = await obtenerUsuarios();
  if (usuarios) {
    usuarios.forEach((usuario) => console.log(usuario.name));
  }
}

function autenticarUsuario(credenciales) {
  const usuarioValido = { usuario: "admin", contrasenia: "12345" };
  return (
    credenciales.usuario === usuarioValido.usuario &&
    credenciales.contrasenia === usuarioValido.contrasenia
  );
}

function mapearUsuarios(usuarios) {
  return usuarios.map(({ name, email }) => ({ nombre: name, email }));
}

function validarFormulario({ nombre, email, password }) {
  return (
    typeof nombre === "string" && nombre.trim() !== "" &&
    typeof email === "string" && email.trim() !== "" &&
    typeof password === "string" && password.trim() !== ""
  );
}

function obtenerPagina(datos, numeroPagina, tamanioPagina = 5) {
  const inicio = (numeroPagina - 1) * tamanioPagina;
  const fin = inicio + tamanioPagina;
  return datos.slice(inicio, fin);
}

async function enviarDatos(data) {
  try {
    const respuesta = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    const resultado = await respuesta.json();
    console.log(resultado);
    return resultado;
  } catch (error) {
    console.error(error);
  }
}

function buscarUsuarioPorEmail(usuarios, email) {
  return usuarios.find((usuario) => usuario.email.toLowerCase() === email.toLowerCase());
}

function generarToken(usuario) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({ ...usuario, exp: Date.now() + 3600000 }));
  const firma = btoa("firma_simulada");
  return `${header}.${payload}.${firma}`;
}

function actualizarUsuario(usuario, cambios) {
  return { ...usuario, ...cambios };
}

const frutas = ["manzana", "banana", "pera"];
frutas.push("naranja");
console.log(frutas);
const frutaEliminada = frutas.pop();
console.log(frutaEliminada);
console.log(frutas);

const matriz = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
];
console.log(matriz[1][1]);

for (let i = 0; i < frutas.length; i++) {
  console.log(frutas[i]);
}

function elevarAlCuadrado(numeros) {
  return numeros.map((num) => num ** 2);
}
console.log(elevarAlCuadrado([2, 3, 4, 5]));

function filtrarMayoresDe(numeros, referencia) {
  return numeros.filter((num) => num > referencia);
}
console.log(filtrarMayoresDe([10, 5, 20, 8, 30], 10));

function sumarElementos(numeros) {
  return numeros.reduce((acumulador, actual) => acumulador + actual, 0);
}
console.log(sumarElementos([1, 2, 3, 4, 5]));

const numerosPrueba = [3, 7, 9, 12, 4];
const hayMayorQueDiez = numerosPrueba.some((num) => num > 10);
console.log(hayMayorQueDiez);

const todosPositivos = numerosPrueba.every((num) => num > 0);
console.log(todosPositivos);

const listaPersonas = [
  { nombre: "Sofía", edad: 22 },
  { nombre: "Mateo", edad: 35 },
  { nombre: "Lucía", edad: 40 }
];
const primeraMayorDe30 = listaPersonas.find((persona) => persona.edad > 30);
console.log(primeraMayorDe30);

const palabras = ["zanahoria", "árbol", "barco", "dado", "casa"];
palabras.sort((a, b) => a.localeCompare(b, "es"));
console.log(palabras);