import {ChainTypes} from "moonstonejs-lib";
import {Apis} from "moonstonejs-ws";

let op_history = parseInt(ChainTypes.operation_history, 10);

class Api {

    lookupAccounts(startChar, limit) {
        return Apis.instance().db_api().exec("lookup_accounts", [
            startChar, limit
        ]);
    }
}

export default new Api();
