class Player {
    constructor(_id, _name, _socketId, _isGameMaster, _roundsLost) {
        this.id = _id;
        this.name = _name;
        this.isGameMaster = _isGameMaster;
        this.roundsLost = _roundsLost;
        this.socketId = _socketId;
        this.isActive = true;
    }
}

module.exports = Player;