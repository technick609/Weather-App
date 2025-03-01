import { useState, useEffect } from "react";
import "../src/style/index.css";
import Header from "./components/Header";
import DefaultScreen from "./components/DefaultScreen";
import SearchResult from "./components/SearchResult";
import { fetchWeatherApi } from "openmeteo";
import { weatherCodesMapping } from "./components/util";

function App() {
  const [dailyForecast, setDailyForecast] = useState(null);
  const [hourlyForecastData, setHourlyForecastData] = useState(null);
  // A state to track data fetching in progress
  const [dataLoading, setDataLoading] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState()
  const [forecastLocation ,setForecastLocation] = useState({
    label : 'New Delhi',
    lat : 28.6139,
    lng : 77.2090
  });

  // A function to check and find closest time frame from given hourly data
  function filterAndFlagClosestTime(data) {
    const currentDate = new Date(); // Current date and time
  
    // Extract keys and values from the provided data
    const entries = Object.entries(data);
  
    // Filter data for today
    const todayData = entries.filter(([dateString]) => {
      const date = new Date(dateString);
      return (
        date.getDate() === currentDate.getDate() &&
        date.getMonth() === currentDate.getMonth() &&
        date.getFullYear() === currentDate.getFullYear()
      );
    });
  
    // Find the closest time from the current time
    let closestTimeIndex = 0;
    let closestTimeDiff = Math.abs(currentDate - new Date(todayData[0][0]));
  
    todayData.forEach(([dateString], index) => {
      const timeDiff = Math.abs(currentDate - new Date(dateString));
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestTimeIndex = index;
      }
    });
  
    // Add a flag to the closest time entry
    const result = todayData.map(([dateString, values], index) => ({
      date: dateString,
      values,
      isClosestTime: index === closestTimeIndex,
    }));
  
    return result;
  }

  // To convert data to desired format 
  function processData(hourly, daily) {
  
    function convertTimeToObjectArray(times, values) {
      const obj = {};
      for(let i = 0; i<= Object.keys(values)?.length -1 ; i++){
        
        times?.length && times.forEach((time,timeIndex)=>{
          obj[time] = {
            ...obj[time],
            [Object.keys(values)[i]] : values[Object.keys(values)[i]]?.[timeIndex],
            weatherCondition : weatherCodesMapping[values.weatherCode[timeIndex]].label
          }
        })
      }
      return obj;
    }
  
    // Build the daily and hourly objects with all data
    const dailyData = convertTimeToObjectArray(daily.time, {
      weatherCode: daily.weatherCode,
      temperature2mMax: daily.temperature2mMax,
      temperature2mMin: daily.temperature2mMin,
      apparentTemperatureMax: daily.apparentTemperatureMax,
      apparentTemperatureMin: daily.apparentTemperatureMin,
      sunset: daily.sunset,
      sunrise: daily.sunrise,
      uvIndexMax: daily.uvIndexMax,
      precipitationSum: daily.precipitationSum,
      windSpeed10mMax: daily.windSpeed10mMax,
      windDirection10mDominant: daily.windDirection10mDominant,
    });
  
    const hourlyFormatted = convertTimeToObjectArray(hourly.time, {
      temperature2m: hourly.temperature2m,
      visibility: hourly.visibility,
      windDirection10m: hourly.windDirection10m,
      apparentTemperature: hourly.apparentTemperature,
      precipitationSum: hourly.precipitation_probability,
      humidity: hourly.humidity,
      windSpeed: hourly.windSpeed,
      weatherCode : hourly.weatherCode
    });
    
    const hourlyData = filterAndFlagClosestTime(hourlyFormatted)

    return {
      dailyData,
      hourlyData,
    };
  }

  const fetchWeather = async (lat,lon, switchToResultScreen) => {
    const params = {
      "latitude": lat ?? 28.6139,
      "longitude": lon ?? 77.2090,
      "hourly": ["temperature_2m", "weather_code", "visibility", "wind_direction_10m", "apparent_temperature","precipitation_probability","relative_humidity_2m","wind_speed_10m"],
      "daily": ["weather_code", "temperature_2m_max", "temperature_2m_min", "apparent_temperature_max", "apparent_temperature_min", "sunset", "uv_index_max", "precipitation_sum", "wind_speed_10m_max", "wind_direction_10m_dominant", "sunrise"],
      "timezone": "auto"
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, params);
    
    // Helper function to form time ranges
    const range = (start, stop, step) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);
    
    // Process first location. Add a for-loop for multiple locations or weather models
    const response = responses[0];
    
    // Attributes for timezone and location
    const utcOffsetSeconds = response.utcOffsetSeconds();
    
    const hourly = response.hourly();
    const daily = response.daily();
    
    // Note: The order of weather variables in the URL query and the indices below need to match!
    const weatherData = {
    
      hourly: {
        time: range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
          (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        temperature2m: hourly.variables(0).valuesArray(),
        weatherCode: hourly.variables(1).valuesArray(),
        visibility: hourly.variables(2).valuesArray(),
        windDirection10m: hourly.variables(3).valuesArray(),
        apparentTemperature: hourly.variables(4).valuesArray(),
        precipitation_probability: hourly.variables(5).valuesArray(),
        humidity : hourly.variables(6).valuesArray(),
        windSpeed : hourly.variables(7).valuesArray(),
      },
      daily: {
        time: range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
          (t) => new Date((t + utcOffsetSeconds) * 1000)
        ),
        weatherCode: daily.variables(0).valuesArray(),
        temperature2mMax: daily.variables(1).valuesArray(),
        temperature2mMin: daily.variables(2).valuesArray(),
        apparentTemperatureMax: daily.variables(3).valuesArray(),
        apparentTemperatureMin: daily.variables(4).valuesArray(),
        sunset: daily.variables(5).valuesArray(),
        uvIndexMax: daily.variables(6).valuesArray(),
        precipitationSum: daily.variables(7).valuesArray(),
        windSpeed10mMax: daily.variables(8).valuesArray(),
        windDirection10mDominant: daily.variables(9).valuesArray(),
        sunrise: daily.variables(10).valuesArray()
      },
    };
    const {hourlyData, dailyData} = processData(weatherData.hourly,weatherData.daily)
    setHourlyForecastData(hourlyData);
    setDailyForecast(dailyData);
    setDataLoading(false);
    if(switchToResultScreen){
      setShowResultScreen(true)
    }
  }

  useEffect(() => {
    setDataLoading(true);
    fetchWeather();
  }, []);

  // A function passed to child and called when any option from the suggestions is clicked
  const clickHandler = (searchItem) => {
    setDataLoading(true);
    setForecastLocation({label:searchItem.label,lat:searchItem.lat,lon:searchItem.lon})
    fetchWeather(searchItem.lat,searchItem.lon, true)
  }

  return (
    <div className="app">
      <Header resultScreen = {showResultScreen}/>
      {/*Conditionally rendering a components based on user search  */}
      {!dataLoading && !showResultScreen && <DefaultScreen clickHandler = {clickHandler} currentWeatherData = {hourlyForecastData?.length ? hourlyForecastData.filter((hour)=>hour.isClosestTime) : []} forecastLocation = {forecastLocation}/> }
      {showResultScreen && !dataLoading && <SearchResult currentWeatherData = {hourlyForecastData?.length ? hourlyForecastData.filter((hour)=>hour.isClosestTime) : []} forecastLocation = {forecastLocation} dailyForecast={dailyForecast}/>}
      <p className="copyright-text">&copy; 2024 Nikhil Tamboli. All Rights Reserved.</p>
    </div>
  );
}

export default App;




