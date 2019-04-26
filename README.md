# BlockM

A Node.js module that allows you to add blockchain funds support (currently only litecoin) to your application. BlockM allows you to integrate a payment system with deposits and withdrawals for your users and even allow them make internal transactions.

Disclaimer: This is a development project, so, its very EXPERIMENTAL and currently supports only LITECOIN. Use it at your own risk.

## How to Use

```
$ npm install blockm
```

### Setup Database and Litecoin Node

Pass down credentials to the module using environment variables

```
$ export DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db'
$ export LTC_HOST=localhost
$ export LTC_PORT=8332
$ export LTC_USER=rpcuser
$ export LTC_PASS=rpcpass
```

And use the module from your code.

```js
const BlockM = require("blockm");

// Sync with Database

BlockM.sync(err => {
  // Check err for errors with database connection.
});

// And when shutdown you should call the close method.
BlockM.close();
```

## Running Tests

### Setup

You will need a PostgreSQL database. An easy way to get one is using a docker container:

```
$ docker run --name blockm-db -p 5433:5432 -e POSTGRES_PASSWORD=<pleasechangeme> -d postgres
```

To pass creds down to the BlockM module you have several options. The easiest way is to set the `DATA_DB` environment variable to an URL that specify all the PostgreSQL connection info.

Other way is just to add all the config to the `lib/models/config.json` , but that is not recommended since you should not bother to edit files.

#### Create Database

Set the database name in the url exported on the `DATA_DB` environment variable:

```
$ cd blockm/
$ DATA_DB='postgres://postgres:<pleasechangeme>@localhost:5432/blockm-db' npm run createdb
```

- Run migrations

```
$ DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db' npm run migrate
```

#### Create Litecoin Node

Lets run a container with `litecoind` as node and configure it to allow RPC connections

- `docker run -v /path/to/store/blockchain/and/wallet:/home/litecoin/.litecoin --rm --name blockm-ltc -p 19332:19332 uphold/litecoind -printtoconsole -testnet -rpcallowip=172.17.0.0/16 -rpcuser=rpcuser -rpcpassword=rpcpass -server`

By using this method, it will allow you to protect the wallet very well and rely on the security of the official litecoin core software, but will need to download the entire blockchain data, so this will require a lot of disk space.

Please open an Issue and propose a better solution.

### Run Testsuite

```
$ git clone git@github.com:cronopio/blockm.git
$ cd blockm/
$ npm install
$ DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db' npm test
```

## Contributing

In general, we follow the "fork-and-pull" Git workflow.

1. Fork the repo on GitHub
2. Clone the project to your own machine
3. Work on your fork
   1. Make your changes and additions
   2. Change or add tests if needed
   3. Run tests and make sure they pass
   4. Add changes to README.md if needed
4. Commit changes to your own branch
5. **Make sure** you merge the latest from "upstream" and resolve conflicts if there is any
6. Repeat step 3(3) above
7. Push your work back up to your fork
8. Submit a Pull request so that we can review your changes

## Proposed API

- BlockM.sync(callback): Sincroniza la base de datos (Checkea conexion DB)
- BlockM.close(): Cierra la conexion con la base de datos
- BlockM.createAccount(callback): Crea una cuenta de fondos con litecoins y retorna su identificador.
- BlockM.deposit(AccountId, callback): Retorna una direccion LTC valida para depositar para esa cuenta
- BlockM.getBalance(AccountId, callback): Retorna el balance actualizado para esa cuenta en la unidad minima
- BlockM.initWithdraw(AccountId, amount, cryptoAddress, callback): Inicia el proceso para registrar un retiro de fondos, la cryptoAddress debe ser valida en la red.
- BlockM.confirm(AccountId, txId, callback): Confirma un retiro de fondos
- BlockM.finishWithdraw(AccountId, txId, callback): Publica un retiro de fondos en el Blockchain para que se haga efectivo.
- BlockM.history(AccountId, callback): Retorna el lista de transacciones para una cuenta en especifico.
- BlockM.moveFunds(AccountIdOrigen, AccountIdDestino, amount, callbak): Este metodo creara las transacciones equivalentes para reflejar el correcto moviemiento del monto (amount en litoshis) desde la cuenta origen a la cuenta destino, si todo sale bien el callback es llamado asi (err, tx, txoposite) siendo tx y txoposite los IDs de las transacciones creadas.
