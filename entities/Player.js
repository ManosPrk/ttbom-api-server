class Player {
    constructor(_id, _name, _isGameMaster, _roundsLost) {
        this.id = _id;
        this.name = _name;
        this.isGameMaster = _isGameMaster;
        this.roundsLost = _roundsLost;
    }
}

module.exports = Player;