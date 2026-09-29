
---

## Development Timeline

| Week | Phase | What You Build |
|------|-------|----------------|
| 1 | Phase 1 + 2 | Data loading, cleaning, preprocessing |
| 2 | Phase 3 + 4 | LSTM model + training pipeline |
| 3 | Phase 5 | Prediction engine with multi-week forecast |
| 4 | Phase 6 | Evaluation, plots, reports |
| 5 | Phase 7 | FastAPI with download endpoints |
| 6 | Phase 8 + 9 | Dashboard + orchestrator |

---

## PHASE 1: Data Ingestion & Validation Module

**File to create:** `data_loader.py`

**Goal:** Build a module that reads your CSV/NC data, validates all 9 columns, 
handles missing values, and prepares it for training.

### Prompt for Phase 1:

Create a Python module called "data_loader.py" for an oceanographic 
prediction project. It must:

1. Read a CSV file with columns: timestamp, longitude, latitude, 
   depth, temperature, salinity, u_current, v_current, chlorophyll
2. Also support reading .nc (NetCDF) files using xarray
3. Validate that all 9 columns exist
4. Parse 'timestamp' as datetime and sort chronologically
5. Detect and report missing values per column
6. Fill missing values using linear interpolation for gaps < 6 hours, 
   and forward-fill for gaps < 12 hours
7. Detect outliers using IQR method for temperature, salinity, 
   u_current, v_current, chlorophyll
8. Add derived features:
   - hour_of_day, day_of_week, month, day_of_year
   - is_monsoon (June-September = 1, else 0)
   - is_flood_season (June 15 - August 15 = 1, else 0)
9. Return a clean pandas DataFrame
10. Include a function called "load_and_validate(file_path)" that 
    returns the cleaned DataFrame and a validation report dictionary

Use pandas, numpy, xarray. Include full error handling and logging.

---

## PHASE 2: Data Preprocessing & Normalization

**File to create:** `preprocessor.py`

**Goal:** Scale the data properly for ML training, create train/test splits, 
and build sliding windows for time-series.

### Prompt for Phase 2:

Create a Python module called "preprocessor.py" that takes the clean 
DataFrame from data_loader.py and prepares it for ML training. It must:

1. Select only numeric feature columns: temperature, salinity, 
   u_current, v_current, chlorophyll (as target features to predict)
2. Use longitude, latitude, depth as static features
3. Add cyclical encoding for time features:
   - hour_sin = sin(2 * pi * hour / 24)
   - hour_cos = cos(2 * pi * hour / 24)
   - month_sin = sin(2 * pi * month / 12)
   - month_cos = cos(2 * pi * month / 12)
   - doy_sin = sin(2 * pi * day_of_year / 365)
   - doy_cos = cos(2 * pi * day_of_year / 365)
4. Apply MinMaxScaler to each target column independently
5. Create sliding window sequences:
   - lookback_window = 168 steps (1 week of hourly data, or 
     equivalent based on data frequency)
   - forecast_horizon = 72 steps (3 days ahead)
   - stride = 1 step
6. Split data: 70% train, 15% validation, 15% test 
   (split chronologically, NO random shuffle)
7. Create PyTorch DataLoaders for train, val, test with batch_size=64
8. Save scaler parameters to a JSON file for inverse-transform later
9. Include a function "prepare_data(df, lookback, horizon)" that 
   returns dataloaders and scaler metadata

Use scikit-learn, torch, pandas, numpy.

---

## PHASE 3: ML Model Architecture

**File to create:** `model.py`

**Goal:** Build a multi-horizon time series forecasting model. 
Recommended: Start with LSTM + Attention, upgrade to Temporal Fusion 
Transformer (TFT).

### Prompt for Phase 3:

Create a Python module called "model.py" with TWO model architectures 
for multi-variate oceanographic time series forecasting:

MODEL 1: LSTM with Attention
- Input: (batch_size, lookback_window, num_features)
- Architecture:
  * 2-layer LSTM, hidden_size=128, dropout=0.2
  * Temporal Attention layer over LSTM outputs
  * Fully connected layer: 128 -> 64 -> forecast_horizon * num_targets
  * Reshape output to (batch_size, forecast_horizon, num_targets)
- num_targets = 5 (temperature, salinity, u_current, v_current, chlorophyll)

MODEL 2: Temporal Fusion Transformer (TFT)
- Use the pytorch_forecasting library
- Configure with:
  * Time-varying known inputs: time features (hour_sin, hour_cos, 
    month_sin, month_cos, doy_sin, doy_cos, is_monsoon, is_flood_season)
  * Time-varying unknown inputs: temperature, salinity, u_current, 
    v_current, chlorophyll
  * Static inputs: longitude, latitude, depth
  * encoder length = lookback_window
  * decoder length = forecast_horizon
  * hidden_size = 64
  * attention_head_size = 4
  * dropout = 0.1

Include:
- A function "get_model(model_type)" that returns the chosen model
- Proper weight initialization
- Model summary printing (total parameters)

Use PyTorch, pytorch_forecasting, torch.nn.

---

## PHASE 4: Training Pipeline

**File to create:** `train.py`

**Goal:** Train the model with proper loss functions, learning rate 
scheduling, early stopping, and logging.

### Prompt for Phase 4:

Create a Python module called "train.py" that trains the oceanographic 
prediction model. It must:

1. Accept parameters:
   - model_type: "lstm" or "tft"
   - data_path: path to CSV/NC file
   - lookback_window: int (default 168)
   - forecast_horizon: int (default 72)
   - epochs: int (default 100)
   - learning_rate: float (default 0.001)
   - batch_size: int (default 64)

2. Training loop:
   - Loss function: Huber Loss (robust to outliers in flood data)
   - Optimizer: AdamW with weight_decay=1e-5
   - LR Scheduler: ReduceLROnPlateau (patience=5, factor=0.5)
   - Early Stopping: patience=10 epochs on validation loss
   - Gradient clipping: max_norm=1.0

3. Validation after each epoch:
   - Calculate per-variable metrics: MAE, RMSE, MAPE, R2 Score
   - Track best model based on average validation loss
   - Log all metrics to a CSV file "training_log.csv"

4. Save artifacts after training:
   - Best model weights: "best_model.pth"
   - Scaler parameters: "scaler_params.json"
   - Feature column names: "feature_config.json"
   - Training history: "training_history.png" (loss curves plot)

5. Include a function "train_model(config_dict)" that runs everything
6. Add checkpoint saving every 10 epochs
7. Print progress bar with tqdm

Use torch, sklearn.metrics, matplotlib, tqdm, json, os.

---

## PHASE 5: Prediction Engine (Multi-Week Forecasting)

**File to create:** `predict.py`

**Goal:** This is the core module. It loads the trained model, takes input 
data, and predicts the next few weeks.

### Prompt for Phase 5:

Create a Python module called "predict.py" that performs multi-week 
oceanographic forecasting. It must:

1. Load trained model, scaler params, and feature config from saved 
   artifacts

2. Function "predict_next_weeks(input_data_path, num_weeks=3)":
   - Read the input CSV/NC data
   - Take the LAST lookback_window timesteps as input
   - For multi-week prediction, use RECURSIVE FORECASTING:
     * Predict next forecast_horizon steps
     * Append predictions to input
     * Slide window forward
     * Repeat until num_weeks * 7 * (steps_per_day) predictions 
       are generated
   - Inverse-transform predictions using saved scaler
   - Clip predictions to physical limits:
     * temperature: 15 to 35 degrees Celsius
     * salinity: 0 to 40 PSU
     * chlorophyll: 0 to 50 mg/m3
     * u_current: -100 to 100 cm/s
     * v_current: -100 to 100 cm/s

3. Output DataFrame must contain ALL columns:
   timestamp, longitude, latitude, depth, temperature, salinity, 
   u_current, v_current, chlorophyll
   - timestamp must continue from the last timestamp in input data
   - Use the SAME frequency as input data (auto-detect frequency)

4. Add prediction confidence intervals:
   - Use MC Dropout (run prediction 50 times with dropout enabled)
   - Calculate 5th percentile, median, 95th percentile
   - Add columns: temp_lower, temp_upper, sal_lower, sal_upper, etc.

5. Function "export_predictions(df, format='csv', path=None)":
   - Export to CSV with all columns
   - Export to NetCDF (.nc) using xarray
   - Return the file path for download

6. Function "get_prediction_summary(df)":
   - Return statistics: mean, std, min, max per variable
   - Flag any anomaly predictions (salinity < 25, chlorophyll > 5)

Use torch, pandas, numpy, xarray, json.

---

## PHASE 6: Evaluation & Visualization Module

**File to create:** `evaluate.py`

**Goal:** Visualize predictions vs actuals, generate reports.

### Prompt for Phase 6:

Create a Python module called "evaluate.py" for oceanographic 
prediction analysis. It must:

1. Function "plot_predictions(actual_df, predicted_df, variables)":
   - Plot time series overlay: actual (blue line) vs predicted 
     (red dashed line) with confidence interval shading
   - One subplot per variable (temperature, salinity, u_current, 
     v_current, chlorophyll)
   - Mark flood season periods with light blue background
   - Save as "prediction_vs_actual.png" at 300 DPI

2. Function "calculate_metrics(actual_df, predicted_df)":
   - Per variable: MAE, RMSE, MAPE, R2, Nash-Sutcliffe Efficiency
   - Overall average metrics
   - Return as a formatted dictionary and print as table

3. Function "plot_error_distribution(errors)":
   - Histogram of prediction errors per variable
   - Q-Q plot for normality check

4. Function "generate_report(metrics, config, save_path)":
   - Create a PDF/HTML report with:
     * Model configuration
     * Training metrics
     * Prediction plots
     * Per-variable accuracy table
     * Anomaly detection summary

5. Function "plot_feature_importance(model)":
   - For TFT: plot variable importance from attention weights
   - For LSTM: plot permutation importance

Use matplotlib, seaborn, sklearn.metrics, numpy, pandas.

---

## PHASE 7: API & Download Service

**File to create:** `api.py`

**Goal:** Make the model accessible via API so users can upload data and 
download predictions.

### Prompt for Phase 7:

Create a FastAPI application called "api.py" that serves the 
oceanographic prediction model. It must have these endpoints:

1. POST /upload-data
   - Accept CSV or NC file upload
   - Validate the file using data_loader.py
   - Return validation report and data summary
   - Store file temporarily with a unique session_id

2. POST /predict
   - Accept JSON body: { "session_id": "...", "num_weeks": 3 }
   - Run prediction using predict.py
   - Store prediction results
   - Return prediction summary statistics

3. GET /download/{session_id}/{format}
   - format = "csv" or "nc"
   - Return the prediction file as a downloadable response
   - Set proper headers: Content-Disposition, Content-Type
   - CSV: text/csv
   - NC: application/x-netcdf

4. GET /prediction-summary/{session_id}
   - Return JSON with:
     * prediction period (start/end dates)
     * statistics per variable (mean, min, max, std)
     * anomaly flags
     * confidence interval ranges

5. GET /model-info
   - Return model type, training date, accuracy metrics

6. GET /health
   - Health check endpoint

Include:
- CORS middleware for frontend integration
- Error handling with proper HTTP status codes
- File cleanup: delete temp files after 1 hour
- Request logging
- Run with uvicorn

Use fastapi, uvicorn, pydantic, shutil, uuid, os.

---

## PHASE 8: Frontend Dashboard

**File to create:** `dashboard.py`

**Goal:** A simple web interface to upload data and download predictions.

### Prompt for Phase 8:

Create a Streamlit dashboard called "dashboard.py" for the 
oceanographic prediction system. It must have:

1. Sidebar:
   - File uploader (CSV or NC)
   - Number of weeks to predict (slider: 1-6)
   - Model type selector (LSTM / TFT)
   - "Run Prediction" button

2. Main Area - Tab 1: "Data Overview"
   - Show uploaded data summary (shape, date range, statistics)
   - Plot each variable's time series
   - Show missing value report

3. Main Area - Tab 2: "Predictions"
   - After prediction runs, show:
     * Predicted time series plots with confidence intervals
     * Prediction vs historical data overlay
     * Per-variable statistics table
     * Anomaly alerts (e.g., "Low salinity predicted on July 15 - 
       possible flood impact")

4. Main Area - Tab 3: "Download"
   - Download button for CSV format
   - Download button for NetCDF format
   - Show file size and row count
   - Use st.download_button() with the prediction DataFrame

5. Main Area - Tab 4: "Model Performance"
   - Show training history plots
   - Show evaluation metrics table
   - Show feature importance chart

Use streamlit, pandas, plotly (for interactive charts), io, base64.

---

## PHASE 9: Main Orchestrator

**File to create:** `main.py`

**Goal:** One script that ties everything together.

### Prompt for Phase 9:

Create a main.py orchestrator script that runs the complete 
oceanographic prediction pipeline. It must:

1. Accept command-line arguments using argparse:
   --mode: "train" or "predict" or "serve"
   --data: path to input CSV/NC file
   --model_type: "lstm" or "tft"
   --lookback: int (default 168)
   --horizon: int (default 72)
   --epochs: int (default 100)
   --num_weeks: int (default 3)
   --output_dir: str (default "./outputs")

2. If mode == "train":
   - Load data -> Preprocess -> Train model -> Save artifacts
   - Print training report

3. If mode == "predict":
   - Load data -> Load model -> Predict next N weeks -> Export results
   - Print prediction summary
   - Save CSV and NC files to output_dir

4. If mode == "serve":
   - Start FastAPI server on port 8000

5. Include proper logging to "pipeline.log"
6. Include timing for each step
7. Include try/except with meaningful error messages

Example usage:
  python main.py --mode train --data ocean_data.csv --model_type lstm
  python main.py --mode predict --data ocean_data.csv --num_weeks 4
  python main.py --mode serve

---

## Key Design Decisions

### Why LSTM + TFT?
- LSTM captures short-term temporal patterns (daily cycles)
- TFT handles multi-horizon forecasting natively and gives variable importance
- Both handle the monsoon seasonality and flood anomalies well

### Why Huber Loss instead of MSE?
- MSE is sensitive to outliers
- Flood events create extreme values
- Huber Loss is robust to these anomalies

### Why Recursive Forecasting for multi-week?
- Direct multi-week prediction loses accuracy
- Recursive: predict 3 days, append, predict next 3 days, repeat
- Maintains temporal consistency over weeks

### Why MC Dropout for confidence intervals?
- Run prediction 50 times with dropout ON
- Gives uncertainty estimates without needing a separate ensemble
- Critical for flood/anomaly predictions

---

## Sample Input Data Format

The system expects data in this exact format:
