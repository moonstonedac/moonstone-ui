var alt = require("../alt-instance");
import {Apis} from "moonstonejs-ws";
import utils from "common/utils";
import WalletApi from "../rpc_api/WalletApi";
import ApplicationApi from "../rpc_api/ApplicationApi";
import WalletDb from "stores/WalletDb";
import {ChainStore} from "moonstonejs-lib";
import big from "bignumber.js";
import assetConstants from "chain/asset_constants";

let wallet_api = new WalletApi();
let application_api = new ApplicationApi();

let inProgress = {};

class AssetActions {

    fundPool(account_id, core, asset, amount) {
        let tr = wallet_api.new_transaction();
        let precision = utils.get_asset_precision(core.get("precision"));
        tr.add_type_operation("asset_fund_fee_pool", {
            "fee": {
                amount: 0,
                asset_id: "1.3.0"
            },
            "from_account": account_id,
            "asset_id": asset.get("id"),
            "amount": amount * precision
        });

        return WalletDb.process_transaction(tr, null, true).then(result => {
            return true;
        }).catch(error => {
            console.log("[AssetActions.js:150] ----- fundPool error ----->", error);
            return false;
        });
    }

    claimPoolFees(account_id, asset, amount) {
        let tr = wallet_api.new_transaction();
        let precision = utils.get_asset_precision(asset.get("precision"));

        tr.add_type_operation("asset_claim_fees", {
            "fee": {
                amount: 0,
                asset_id: 0
            },
            "issuer": account_id,
            "amount_to_claim": {
                "asset_id": asset.get("id"),
                "amount": amount * precision
            }
        });

        return WalletDb.process_transaction(tr, null, true).then(result => {
            return true;
        }).catch(error => {
            console.log("[AssetActions.js:150] ----- claimFees error ----->", error);
            return false;
        });
    }

    createAsset(account_id, createObject, flags, permissions, cer, isSmartAsset, is_prediction_market, smartasset_opts, description) {
        // Create asset action here...
        console.log("create asset:", createObject, "flags:", flags, "isSmartAsset:", isSmartAsset, "smartasset_opts:", smartasset_opts);
        let tr = wallet_api.new_transaction();
        let precision = utils.get_asset_precision(createObject.precision);

        big.config({DECIMAL_PLACES: createObject.precision});
        let max_supply = (new big(createObject.max_supply)).times(precision).toString();
        let max_market_fee = (new big(createObject.max_market_fee || 0)).times(precision).toString();
        // console.log("max_supply:", max_supply);
        // console.log("max_market_fee:", max_market_fee);

        let corePrecision = utils.get_asset_precision(ChainStore.getAsset(cer.base.asset_id).get("precision"));

        let operationJSON = {
            "fee": {
                amount: 0,
                asset_id: 0
            },
            "issuer": account_id,
            "symbol": createObject.symbol,
            "precision": parseInt(createObject.precision, 10),
            "common_options": {
                "max_supply": max_supply,
                "market_fee_percent": createObject.market_fee_percent * 100 || 0,
                "max_market_fee": max_market_fee,
                "issuer_permissions": permissions,
                "flags": flags,
                "core_exchange_rate": {
                    "base": {
                        "amount": cer.base.amount * corePrecision,
                        "asset_id": cer.base.asset_id
                    },
                    "quote": {
                        "amount": cer.quote.amount * precision,
                        "asset_id": "1.3.1"
                    }
                },
                "whitelist_authorities": [

                ],
                "blacklist_authorities": [

                ],
                "whitelist_markets": [

                ],
                "blacklist_markets": [

                ],
                "description": description,
                "extensions": null
            },
            "is_prediction_market": is_prediction_market,
            "extensions": null
        }

        if (isSmartAsset) {
            operationJSON.smartasset_opts = smartasset_opts;
        }

        tr.add_type_operation("asset_create", operationJSON);
        return WalletDb.process_transaction(tr, null, true).then(result => {
            // console.log("asset create result:", result);
            // this.dispatch(account_id);
            return true;
        }).catch(error => {
            console.log("[AssetActions.js:150] ----- createAsset error ----->", error);
            return false;
        });
    }

    updateAsset(issuer, new_issuer, update, core_exchange_rate, asset, flags, permissions,
            isSmartAsset, smartasset_opts, original_smartasset_opts, description) {
        
        // Create asset action here...
        let tr = wallet_api.new_transaction();
        let quotePrecision = utils.get_asset_precision(asset.get("precision"));

        big.config({DECIMAL_PLACES: asset.get("precision")});
        let max_supply = (new big(update.max_supply)).times(quotePrecision).toString();
        let max_market_fee = (new big(update.max_market_fee || 0)).times(quotePrecision).toString();

        let cr_quote_asset = ChainStore.getAsset(core_exchange_rate.quote.asset_id);
        let cr_quote_precision = utils.get_asset_precision(cr_quote_asset.get("precision"));
        let cr_base_asset = ChainStore.getAsset(core_exchange_rate.base.asset_id);
        let cr_base_precision = utils.get_asset_precision(cr_base_asset.get("precision"));

        let cr_quote_amount = (new big(core_exchange_rate.quote.amount)).times(cr_quote_precision).toString();
        let cr_base_amount = (new big(core_exchange_rate.base.amount)).times(cr_base_precision).toString();

        let updateObject = {
            fee: {
                amount: 0,
                asset_id: 0
            },
            asset_to_update: asset.get("id"),
            extensions: asset.get("extensions"),
            issuer: issuer,
            new_issuer: new_issuer,
            new_options: {
                max_supply: max_supply,
                max_market_fee: max_market_fee,
                market_fee_percent: update.market_fee_percent * 100,
                description: description,
                issuer_permissions: permissions,
                flags: flags,
                whitelist_authorities: asset.getIn(["options", "whitelist_authorities"]),
                blacklist_authorities: asset.getIn(["options", "blacklist_authorities"]),
                whitelist_markets: asset.getIn(["options", "whitelist_markets"]),
                blacklist_markets: asset.getIn(["options", "blacklist_markets"]),
                extensions: asset.getIn(["options", "extensions"]),
                core_exchange_rate: {
                    quote: {
                        amount: cr_quote_amount,
                        asset_id: core_exchange_rate.quote.asset_id
                    },
                    base: {
                        amount: cr_base_amount,
                        asset_id: core_exchange_rate.base.asset_id
                    }
                }
            }
        };

        if (issuer === new_issuer || !new_issuer) {
            delete updateObject.new_issuer;
        }
        tr.add_type_operation("asset_update", updateObject);

        console.log("smartasset_opts:", smartasset_opts, "original_smartasset_opts:", original_smartasset_opts);
        if (isSmartAsset &&
            (   smartasset_opts.feed_lifetime_sec !== original_smartasset_opts.feed_lifetime_sec ||
                smartasset_opts.minimum_feeds !== original_smartasset_opts.minimum_feeds ||
                smartasset_opts.force_settlement_delay_sec !== original_smartasset_opts.force_settlement_delay_sec ||
                smartasset_opts.force_settlement_offset_percent !== original_smartasset_opts.force_settlement_offset_percent ||
                smartasset_opts.maximum_force_settlement_volume !== original_smartasset_opts.maximum_force_settlement_volume ||
                smartasset_opts.short_backing_asset !== original_smartasset_opts.short_backing_asset)) {

            let smartAssetUpdateObject = {
                fee: {
                    amount: 0,
                    asset_id: 0
                },
                asset_to_update: asset.get("id"),
                issuer: issuer,
                new_options: smartasset_opts
            }

            tr.add_type_operation("asset_update_smartasset", smartAssetUpdateObject);
            
        }

        return WalletDb.process_transaction(tr, null, true).then(result => {
            // console.log("asset create result:", result);
            // this.dispatch(account_id);
            return true;
        }).catch(error => {
            console.log("[AssetActions.js:150] ----- createAsset error ----->", error);
            return false;
        });
    }

    issueAsset(to_account, from_account, asset_id, amount, memo) {

        application_api.issue_asset(to_account, from_account, asset_id, amount, memo);
    }

    // issueAsset(account_id, issueObject) {
    //     console.log("account_id: ", account_id, issueObject);
    //     // Create asset action here...
    //     var tr = wallet_api.new_transaction();
    //     tr.add_type_operation("asset_issue", {
    //         fee: {
    //             amount: 0,
    //             asset_id: 0
    //         },
    //         "issuer": account_id,
    //         "asset_to_issue": {
    //             "amount": issueObject.amount,
    //             "asset_id": issueObject.asset_id
    //         },
    //         "issue_to_account": issueObject.to_id,

    //         "extensions": [

    //         ]
    //     });
    //     return WalletDb.process_transaction(tr, null, true).then(result => {
    //         console.log("asset issue result:", result);
    //         // this.dispatch(account_id);
    //         return true;
    //     }).catch(error => {
    //         console.log("[AssetActions.js:150] ----- createAsset error ----->", error);
    //         return false;
    //     });
    // }

    getAssetList(start, count) {

        let id = start + "_" + count;
        if (!inProgress[id]) {
            inProgress[id] = true;
            Apis.instance().db_api().exec("list_assets", [
                    start, count
                ]).then(assets => {
                    let smartAssetIDS = [];
                    let dynamicIDS = [];

                    assets.forEach(asset => {
                        ChainStore._updateObject(asset, false);
                        dynamicIDS.push(asset.dynamic_asset_data_id);

                        if (asset.smartasset_data_id) {
                            smartAssetIDS.push(asset.smartasset_data_id);
                        }
                    });

                    let dynamicPromise = Apis.instance().db_api().exec("get_objects", [
                        dynamicIDS
                    ]);

                    let smartAssetPromise = smartAssetIDS.length > 0 ? Apis.instance().db_api().exec("get_objects", [
                        smartAssetIDS
                    ]) : null;

                    Promise.all([
                            dynamicPromise,
                            smartAssetPromise
                        ])
                        .then(results => {
                            this.dispatch({
                                assets: assets,
                                dynamic_data: results[0],
                                smartasset_data: results[1]
                            });
                            delete inProgress[id];

                        });
                })
                .catch(error => {
                    console.log("Error in AssetStore.getAssetList: ", error);
                    delete inProgress[id];
                });
        }
    }

    getAsset(id) {
        let assetPromise;
        if (!inProgress[id]) {
            inProgress[id] = true;
            if (utils.is_object_id(id)) {
                assetPromise = Apis.instance().db_api().exec("get_objects", [
                    [id]
                ]);
            } else {
                assetPromise = Apis.instance().db_api().exec("list_assets", [
                    id, 1
                ]);
            }

            return assetPromise.then((asset) => {

                if (asset.length === 0 || !asset) {
                    return this.dispatch({
                        asset: null,
                        id: id
                    });
                }
                let smartAssetPromise = asset[0].smartasset_data_id ? Apis.instance().db_api().exec("get_objects", [
                    [asset[0].smartasset_data_id]
                ]) : null;

                Promise.all([
                        Apis.instance().db_api().exec("get_objects", [
                            [asset[0].dynamic_asset_data_id]
                        ]),
                        smartAssetPromise
                    ])
                    .then(results => {
                        this.dispatch({
                            asset: asset[0],
                            dynamic_data: results[0][0],
                            smartasset_data: results[1] ? results[1][0] : null
                        });
                        delete inProgress[id];
                    });

            }).catch((error) => {
                console.log("Error in AssetStore.updateAsset: ", error);
                delete inProgress[id];
            });
        }
    }

    lookupAsset(symbol, searchID) {
        let asset = ChainStore.getAsset(symbol);

        if (asset) {
            this.dispatch({
                assets: [asset],
                searchID: searchID,
                symbol: symbol
            });
        } else {
            // Hack to retry once until we replace this method with a new api call to lookup multiple assets
            setTimeout(() => {
                let asset = ChainStore.getAsset(symbol);
                if (asset) {
                    this.dispatch({
                        assets: [asset],
                        searchID: searchID,
                        symbol: symbol
                    });
                }
            }, 200);
        }
    }

    reserveAsset(amount, assetId, payer) {
        console.log("reserveAsset: ", amount, assetId);
        
        var tr = wallet_api.new_transaction();
        tr.add_type_operation("asset_reserve", {
            fee: {
                amount: 0,
                asset_id: 0
            },
            "amount_to_reserve": {
                "amount": amount,
                "asset_id": assetId
            },
            payer,
            "extensions": [
            ]
        });
        return WalletDb.process_transaction(tr, null, true).then(result => {
            console.log("asset reserve result:", result);
            // this.dispatch(account_id);
            return true;
        }).catch(error => {
            console.log("[AssetActions.js:150] ----- reserveAsset error ----->", error);
            return false;
        });
    }
}

export default alt.createActions(AssetActions);
