package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

type Game struct {
	GameID     string `json:"game_id"`
	Time       string `json:"time"`
	TimeStatus string `json:"time_status"`
	League     string `json:"league"`
	Home       string `json:"home"`
	Away       string `json:"away"`
	Scores     string `json:"scores"`
	Sport      string `json:"sport"`
	StartTime  string `json:"start_time"`
}

type PrematchFile struct {
	Games []Game `json:"games_pre"`
}

type LiveGameRaw struct {
	Type string `json:"type"`
	NA   string `json:"NA"`
	CT   string `json:"CT"`
	SS   string `json:"SS"`
	ID   string `json:"ID"`
}

// Redis
var (
	rdb      = redis.NewClient(&redis.Options{Addr: "localhost:6379"})
	ctx      = context.Background()
	logError *log.Logger
)

// Определение вида спорта
func detectSport(league string) string {
	l := strings.ToLower(league)
	switch {
	case strings.Contains(l, "esoccer"), strings.Contains(l, "etable tennis"),
		strings.Contains(l, "ebasketball"), strings.Contains(l, "efighting"),
		strings.Contains(l, "cs2"), strings.Contains(l, "fifa"),
		strings.Contains(l, "волта"), strings.Contains(l, "кибер"),
		strings.Contains(l, "virtual"):
		return "Киберспорт"
	case strings.Contains(l, "nba"), strings.Contains(l, "баскетбол"),
		strings.Contains(l, "basketball"):
		return "Баскетбол"
	case strings.Contains(l, "теннис"), strings.Contains(l, "tennis"):
		return "Теннис"
	case strings.Contains(l, "волейбол"), strings.Contains(l, "volleyball"):
		return "Волейбол"
	case strings.Contains(l, "mma"), strings.Contains(l, "ufc"),
		strings.Contains(l, "fight"), strings.Contains(l, "бокс"),
		strings.Contains(l, "boxing"), strings.Contains(l, "бой"):
		return "Единоборства"
	case strings.Contains(l, "formula"), strings.Contains(l, "speedway"),
		strings.Contains(l, "motogp"), strings.Contains(l, "nascar"):
		return "Автоспорт"
	case strings.Contains(l, "cricket"), strings.Contains(l, "крикет"):
		return "Крикет"
	case strings.Contains(l, "nhl"), strings.Contains(l, "хоккей"),
		strings.Contains(l, "ice hockey"):
		return "Хоккей"
	default:
		return "Футбол"
	}
}

func loadAllGamesWithTimezone(loc *time.Location) ([]Game, error) {
	var liveGames, prematchGames []Game

	// Попытка из Redis
	liveCached, err := rdb.Get(ctx, "live_games_cache").Result()
	if err == nil {
		_ = json.Unmarshal([]byte(liveCached), &liveGames)
		log.Println("📦 LIVE из Redis")
	}

	prematchCached, err := rdb.Get(ctx, "prematch_games_cache").Result()
	if err == nil {
		_ = json.Unmarshal([]byte(prematchCached), &prematchGames)
		log.Println("📦 PREMATCH из Redis")
	}

	if len(liveGames) > 0 && len(prematchGames) > 0 {
		return append(liveGames, prematchGames...), nil
	}

	// LIVE из API
	if len(liveGames) == 0 {
		resp, err := http.Get("https://bookiesapi.com/api/get.php?login=Kaerdin&token=36365-oW3gmNHXB4SWy2S&task=bet365live")
		if err != nil {
			logError.Printf("Ошибка LIVE: %v", err)
		} else {
			defer resp.Body.Close()
			var liveRaw map[string]interface{}
			if json.NewDecoder(resp.Body).Decode(&liveRaw) == nil {
				if results, ok := liveRaw["results"].([]interface{}); ok {
					for _, group := range results {
						if groupArray, ok := group.([]interface{}); ok {
							for _, item := range groupArray {
								data, _ := json.Marshal(item)
								var ev LiveGameRaw
								json.Unmarshal(data, &ev)
								if ev.Type == "EV" {
									parts := strings.Split(ev.NA, " v ")
									home := parts[0]
									away := ""
									if len(parts) > 1 {
										away = parts[1]
									}
									sport := detectSport(ev.CT)

									// 🕒 Время старта
									var timestamp int64
									if len(ev.ID) >= 10 {
										if ts, err := strconv.ParseInt(ev.ID[:10], 10, 64); err == nil && ts > 1700000000 {
											timestamp = ts
										}
									}
									if timestamp == 0 {
										timestamp = time.Now().Unix()
									}
									startTime := time.Unix(timestamp, 0).In(loc).Format("2006-01-02 15:04:05")
									timeRaw := strconv.FormatInt(timestamp, 10)

									game := Game{
										GameID:     ev.ID,
										TimeStatus: "live",
										League:     ev.CT,
										Home:       home,
										Away:       away,
										Scores:     ev.SS,
										Sport:      sport,
										Time:       timeRaw,
										StartTime:  startTime,
									}
									liveGames = append(liveGames, game)
								}
							}
						}
					}
				}
			}
		}
		if data, err := json.Marshal(liveGames); err == nil {
			rdb.Set(ctx, "live_games_cache", data, 15*time.Second)
		}
	}

	// PREMATCH из файла
	if len(prematchGames) == 0 {
		file, err := os.Open("allPrematch.json")
		if err != nil {
			logError.Printf("Ошибка открытия allPrematch.json: %v", err)
		} else {
			defer file.Close()
			var prematchFile PrematchFile
			if err := json.NewDecoder(file).Decode(&prematchFile); err == nil {
				for _, g := range prematchFile.Games {
					g.Sport = detectSport(g.League)
					g.TimeStatus = "prematch"
					if ts, err := strconv.ParseInt(g.Time, 10, 64); err == nil {
						g.StartTime = time.Unix(ts, 0).In(loc).Format("2006-01-02 15:04:05")
					}
					prematchGames = append(prematchGames, g)
				}
				if data, err := json.Marshal(prematchGames); err == nil {
					rdb.Set(ctx, "prematch_games_cache", data, 60*time.Second)
				}
			}
		}
	}

	return append(liveGames, prematchGames...), nil
}

func getGamesBySport(c *gin.Context) {
	sport := c.Query("sport")
	tz := c.DefaultQuery("tz", "UTC")
	loc, err := time.LoadLocation(tz)
	if err != nil {
		logError.Printf("Неверный часовой пояс '%s', используется UTC", tz)
		loc = time.UTC
	}

	games, err := loadAllGamesWithTimezone(loc)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки матчей"})
		return
	}

	var filtered []Game
	for _, g := range games {
		if sport == "" || strings.EqualFold(g.Sport, sport) {
			filtered = append(filtered, g)
		}
	}

	c.JSON(http.StatusOK, filtered)
}

func getUniqueSports(c *gin.Context) {
	games, err := loadAllGamesWithTimezone(time.UTC)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки матчей"})
		return
	}
	set := make(map[string]bool)
	for _, g := range games {
		set[g.Sport] = true
	}
	var sports []string
	for s := range set {
		sports = append(sports, s)
	}
	c.JSON(http.StatusOK, sports)
}

func getSportStats(c *gin.Context) {
	games, err := loadAllGamesWithTimezone(time.UTC)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка загрузки матчей"})
		return
	}
	stats := make(map[string]int)
	for _, g := range games {
		stats[g.Sport]++
	}
	type Stat struct {
		Sport string `json:"sport"`
		Count int    `json:"count"`
	}
	var result []Stat
	for s, c := range stats {
		result = append(result, Stat{Sport: s, Count: c})
	}
	c.JSON(http.StatusOK, result)
}

func clearCache(c *gin.Context) {
	rdb.Del(ctx, "live_games_cache")
	rdb.Del(ctx, "prematch_games_cache")
	log.Println("🧹 Кэш очищен вручную")
	c.JSON(http.StatusOK, gin.H{"status": "Кэш очищен"})
}

func main() {
	_ = os.MkdirAll("logs", 0755)
	appLog, _ := os.OpenFile("logs/app.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	log.SetOutput(appLog)

	errLog, _ := os.OpenFile("logs/error.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	logError = log.New(errLog, "ERROR: ", log.Ldate|log.Ltime|log.Lshortfile)

	router := gin.Default()
	router.Use(cors.Default())

	router.GET("/games", getGamesBySport)
	router.GET("/sports", getUniqueSports)
	router.GET("/sports/stats", getSportStats)
	router.GET("/cache/clear", clearCache)

	log.Println("🚀 Сервер запущен на http://localhost:8888")
	router.Run(":8888")
}
