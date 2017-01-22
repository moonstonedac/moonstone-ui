var _this;

var ecc_config = {
    address_prefix: process.env.npm_config__moonstone_ecc_default_address_prefix || "XMS"
};

module.exports = _this = {
    core_asset: "XMS",
    address_prefix: "XMS",
    expire_in_secs: 15,
    expire_in_secs_proposal: 24 * 60 * 60,
    networks: {
        Moonstone: {
            core_asset: "XMS",
            address_prefix: "XMS",
            chain_id: "f3bebc47a4c53877cac2dc53317b0889716926688ac216f34fb093bd9d9cdb6a"
        }
    },

    /** Set a few properties for known chain IDs. */
    setChainId: function(chain_id) {

        var i, len, network, network_name, ref;
        ref = Object.keys(_this.networks);

        for (i = 0, len = ref.length; i < len; i++) {

            network_name = ref[i];
            network = _this.networks[network_name];

            if (network.chain_id === chain_id) {

                _this.network_name = network_name;

                if (network.address_prefix) {
                    _this.address_prefix = network.address_prefix;
                    ecc_config.address_prefix = network.address_prefix;
                }

                // console.log("INFO    Configured for", network_name, ":", network.core_asset, "\n");

                return {
                    network_name: network_name,
                    network: network
                }
            }
        }

        if (!_this.network_name) {
            console.log("Unknown chain id (this may be a testnet)", chain_id);
        }

    },

    reset: function() {
        _this.core_asset = "XMS";
        _this.address_prefix = "XMS";
        ecc_config.address_prefix = "XMS";
        _this.expire_in_secs = 15;
        _this.expire_in_secs_proposal = 24 * 60 * 60;

        console.log("Chain config reset");
    },

    setPrefix: function(prefix = "XMS") {
        _this.address_prefix = prefix;
        ecc_config.address_prefix = prefix;
    }

}
