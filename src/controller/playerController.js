import playerService from "../service/playerService.js" ;

const playerController = {

  getAllPlayers: async (req, res) => {
    try {
      const players = await playerService.getAllPlayers();
      res.status(200).json({
        success: true,
        message: "Players retrieved successfully!",
        data: players,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve players",
      });
    }
  },

  /**
   * Controller to fetch a specific player by Player ID
   */
  getPlayerById: async (req, res) => {
    const { playerId } = req.params;

    try {
      const player = await playerService.getPlayerById(playerId);
      res.status(200).json({
        success: true,
        message: "Player retrieved successfully!",
        data: player,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "Failed to retrieve player",
      });
    }
  },
};

export default playerController;
