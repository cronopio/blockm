# BlockM

Node.js module that allow you add blockchain funds support (by now only litecoin) to your application. BlockM allow you to integrate a payment system with deposits, withdrawals to your users and even allow them make internal transactions.

Starting project, so, its very EXPERIMENTAL and only support LITECOIN by now.


## Running Tests

### Setup

Need a PostgreSQL database, an easy way to get one is using a docker container:

```
$ docker run --name blockm-db -p 5433:5432 -e POSTGRES_PASSWORD=pleasechangeme -d postgres
```

To pass creds down to the BlockM module you have several options, easiest way is set the `DATA_DB` environment variable to an URL that specify all the PostgreSQL connection info.

Other way is just add all the config to the `lib/models/config.json` but that is not recommended since you should not bother to edit files.

#### Create Database

Set the database name in the url exported on the `DATA_DB` environment variable

```
$ cd blockm/
$ DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db' npm run createdb
```
 * Run migrations

 ```
 $ DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db' npm run migrate
 ```

### Run Testsuite

```
$ git clone git@github.com:cronopio/blockm.git
$ cd blockm/
$ npm install
$ DATA_DB='postgres://postgres:pleasechangeme@localhost:5432/blockm-db' npm test
```


## Proposed API

 * MoneyManager.sync(callback): Sincroniza la base de datos (Checkea conexion DB)
 * MoneyManager.close(): Cierra la conexion con la base de datos
 * MoneyManager.createAccount(callback): Crea una cuenta de fondos con litecoins y retorna su identificador.
 * MoneyManager.deposit(AccountId, callback): Retorna una direccion LTC valida para depositar para esa cuenta
 * MoneyManager.getBalance(AccountId, callback): Retorna el balance actualizado para esa cuenta en la unidad minima
 * MoneyManager.initWithdraw(AccountId, amount, cryptoAddress, callback): Inicia el proceso para registrar un retiro de fondos, la cryptoAddress debe ser valida en la red.
 * MoneyManager.confirm(AccountId, txId, callback): Confirma un retiro de fondos
 * MoneyManager.finishWithdraw(AccountId, txId, callback): Publica un retiro de fondos en el Blockchain para que se haga efectivo.
 * MoneyManager.history(AccountId, callback): Retorna el lista de transacciones para una cuenta en especifico.
 * MoneyManager.moveFunds(AccountIdOrigen, AccountIdDestino, amount, callbak): Este metodo creara las transacciones equivalentes para reflejar el correcto moviemiento del monto (amount en litoshis) desde la cuenta origen a la cuenta destino, si todo sale bien el callback es llamado asi (err, tx, txoposite) siendo tx y txoposite los IDs de las transacciones creadas.