// EasyGo GPS Provider API Client
// Documentation: https://vtsapi.easygo-gps.co.id/swagger/ui/index

export interface EasyGoVehicle {
  vehicle_id: string;
  nopol: string;
  type: string;
  model: string;
  brand: string;
  car_group: string;
  driver_nm: string;
  gps_sn: string;
  remark: string;
  engine_no: string;
  chasis_no: string;
}

export interface EasyGoLastPosition {
  vehicle_id: string;
  nopol: string;
  lat: number;
  lon: number;
  speed: number;
  direction: string;
  gps_time: string;
  gps_time_iso: string;
  status_vehicle: number; // 0=parking, 1=idle, 2=driving
  addr: string;
  odometer: number;
  fuel_level: number;
  acc: string;
  altitude: number;
  gps_satelit: number;
  main_power_voltage: number;
  backup_battery_voltage: number;
  gsm_signal: number;
  sos: number;
  is_alarm: number;
  alarm_nm: string;
  report_nm: string;
  currentStatusVehicle: {
    status: number;
    ket: string;
    driving: any;
    parking: any;
    idle: any;
  };
  totalkm_today: {
    total_km: number;
    max_speed: number;
    avg_speed: number;
    dur_moving: number;
  } | null;
}

export interface EasyGoHistoryPoint {
  no_pol: string;
  speed: string;
  lat: string;
  lon: string;
  gps_time: string;
  gps_time_iso: string;
  direction: string;
  acc: string;
  odometer: string;
  address: string;
  statusKendaraan: string;
  gps_satelit: string;
  main_power_voltage: string;
  backup_battery_voltage: string;
  gsm_signal: string;
  sos: string;
  input1: string;
  input2: string;
  input_analog: number | null;
}

export interface EasyGoApiResponse<T> {
  ResponseCode: number;
  ResponseMessage: string;
  Data: T;
}

export interface EasyGoPagedResponse<T> {
  list: T[];
  paging: {
    totalRecord: number;
    currentPage: number;
    totalPage: number;
  };
}

export class EasyGoClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
  }

  private async post<T>(path: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': this.token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`EasyGo API error: ${response.status} ${response.statusText}`);
    }

    const result: EasyGoApiResponse<T> = await response.json();

    if (result.ResponseCode === 0) {
      throw new Error(`EasyGo API error: ${result.ResponseMessage}`);
    }

    return result.Data;
  }

  /**
   * Get all vehicles master data
   */
  async getVehicles(nopol?: string): Promise<EasyGoVehicle[]> {
    return this.post<EasyGoVehicle[]>('/api/Master/vehicles', {
      nopol: nopol || null,
    });
  }

  /**
   * Get last position for all or specific vehicles
   */
  async getLastPosition(nopolList?: string[]): Promise<EasyGoLastPosition[]> {
    return this.post<EasyGoLastPosition[]>('/api/Report/lastposition', {
      list_nopol: nopolList || null,
      list_vehicle_id: null,
      encrypted: 0,
    });
  }

  /**
   * Get GPS history data for a specific vehicle
   */
  async getHistoryData(
    startDate: string,
    endDate: string,
    nopol: string,
    page?: number,
    limit?: number
  ): Promise<EasyGoPagedResponse<EasyGoHistoryPoint>> {
    return this.post<EasyGoPagedResponse<EasyGoHistoryPoint>>('/api/Report/historydata', {
      start_time: startDate,
      stop_time: endDate,
      lstNoPol: [nopol],
      page: page || 1,
      limit: limit || 100,
      encrypted: 0,
    });
  }

  /**
   * Get trip report for a vehicle
   */
  async getTripReport(
    startDate: string,
    endDate: string,
    nopolList?: string[]
  ): Promise<any[]> {
    return this.post<any[]>('/api/Report/trip', {
      start_time: startDate,
      stop_time: endDate,
      lstNoPol: nopolList || null,
    });
  }

  /**
   * Test connection to EasyGo API
   */
  async testConnection(): Promise<{ success: boolean; vehicleCount: number; message: string }> {
    try {
      const vehicles = await this.getVehicles();
      return {
        success: true,
        vehicleCount: vehicles.length,
        message: `Connected. ${vehicles.length} vehicles found.`,
      };
    } catch (error: any) {
      return {
        success: false,
        vehicleCount: 0,
        message: error.message || 'Connection failed',
      };
    }
  }
}
