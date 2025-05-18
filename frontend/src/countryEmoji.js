export default function countryEmoji(league) {
    const map = {
      germany: '🇩🇪',
      spain: '🇪🇸',
      france: '🇫🇷',
      england: '🏴',
      italy: '🇮🇹',
      austria: '🇦🇹',
      portugal: '🇵🇹',
      netherlands: '🇳🇱',
      brazil: '🇧🇷',
      argentina: '🇦🇷',
      usa: '🇺🇸',
      russia: '🇷🇺',
      ukraine: '🇺🇦',
      poland: '🇵🇱',
      romania: '🇷🇴'
    };
  
    const l = league.toLowerCase();
    for (const k in map) {
      if (l.includes(k)) return map[k];
    }
    return '🌍';
  }
  