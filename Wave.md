#!/usr/bin/env python3
"""
NASA Perpetual Ocean 2 - Particle Tracking Simulation
Based on ECCO-2 ocean circulation model
Recreates the ocean current visualization with Lagrangian particles
"""

import numpy as np
from parcels import FieldSet, ParticleSet, JITParticle, Variable, AdRK4
from parcels import Field, GeographicPolar
from datetime import timedelta, datetime
import xarray as xr
import matplotlib.pyplot as plt
from mpl_toolkits.basemap import Basemap

class OceanParticle(JITParticle):
    """
    Custom particle class with temperature and depth tracking
    Similar to NASA's visualization particles
    """
    # Custom variables for each particle
    temperature = Variable('temperature', dtype=np.float32)
    depth_initial = Variable('depth_initial', dtype=np.float32)
    trail_length = Variable('trail_length', dtype=np.float32)
    age = Variable('age', dtype=np.float32)
    
    def __init__(self, lon, lat, depth, time=0):
        super().__init__(lon=lon, lat=lat, depth=depth, time=time)
        self.depth_initial = depth
        # Set trail length based on depth (matching NASA's parameters)
        self.trail_length = 3 if depth < 600 else 6  # days
        self.age = 0

def create_ecco_fieldset(ecco_data_path, start_date, end_date):
    """
    Create Parcels FieldSet from ECCO-2 model output
    
    Parameters:
    -----------
    ecco_data_path : str
        Path to ECCO-2 NetCDF files
    start_date : datetime
        Simulation start date
    end_date : datetime
        Simulation end date
    """
    
    # ECCO-2 provides 3D velocity fields (U, V, W) and temperature
    # You would load actual ECCO-2 data here
    # For demonstration, we'll create a simplified version
    
    filenames = {
        'U': f'{ecco_data_path}/ECCO2_U_*.nc',
        'V': f'{ecco_data_path}/ECCO2_V_*.nc',
        'W': f'{ecco_data_path}/ECCO2_W_*.nc',
        'T': f'{ecco_data_path}/ECCO2_T_*.nc'
    }
    
    variables = {
        'U': 'u',
        'V': 'v',
        'W': 'w',
        'T': 'theta'
    }
    
    dimensions = {
        'lon': 'XC',
        'lat': 'YC',
        'depth': 'Z',
        'time': 'T'
    }
    
    fieldset = FieldSet.from_netcdf(
        filenames,
        variables,
        dimensions,
        mesh='spherical'
    )
    
    return fieldset

def create_global_particle_release(fieldset, num_particles=10000):
    """
    Release particles globally similar to NASA's visualization
    
    Parameters:
    -----------
    fieldset : parcels.FieldSet
        Ocean velocity field
    num_particles : int
        Number of particles to release
    """
    
    # Create global grid of particle release locations
    # NASA releases particles at various depths
    lons = np.linspace(-180, 180, int(np.sqrt(num_particles)))
    lats = np.linspace(-80, 80, int(np.sqrt(num_particles)))
    
    # Create meshgrid for even distribution
    lon_grid, lat_grid = np.meshgrid(lons, lats)
    lons = lon_grid.flatten()
    lats = lat_grid.flatten()
    
    # Release particles at different depths (0-5000m)
    depths = np.random.uniform(0, 5000, size=len(lons))
    
    # Create particle set
    pset = ParticleSet(
        fieldset=fieldset,
        pclass=OceanParticle,
        lon=lons,
        lat=lats,
        depth=depths,
        time=0
    )
    
    print(f"Released {len(pset)} particles globally")
    print(f"  - Surface particles (<600m): {np.sum(depths < 600)}")
    print(f"  - Deep particles (>600m): {np.sum(depths >= 600)}")
    
    return pset

def create_regional_particle_release(fieldset, region='gulf_stream', 
                                      num_particles=115000):
    """
    Create regional particle release (e.g., Gulf of Mexico for Gulf Stream study)
    This replicates NASA's experiment with 115,000 particles [[22]]
    
    Parameters:
    -----------
    region : str
        Region to focus on: 'gulf_stream', 'agulhas', 'kuroshio', etc.
    num_particles : int
        Number of particles
    """
    
    # Define regional boundaries
    regions = {
        'gulf_stream': {
            'lon': (-98, -80),
            'lat': (18, 30),
            'name': 'Gulf of Mexico'
        },
        'agulhas': {
            'lon': (20, 40),
            'lat': (-40, -25),
            'name': 'Agulhas Current'
        },
        'kuroshio': {
            'lon': (120, 145),
            'lat': (15, 35),
            'name': 'Kuroshio Current'
        }
    }
    
    if region not in regions:
        raise ValueError(f"Unknown region: {region}")
    
    reg = regions[region]
    
    # Random particle positions within region
    lons = np.random.uniform(reg['lon'][0], reg['lon'][1], num_particles)
    lats = np.random.uniform(reg['lat'][0], reg['lat'][1], num_particles)
    
    # Mix of surface and deep particles
    depths = np.random.uniform(0, 3000, num_particles)
    
    pset = ParticleSet(
        fieldset=fieldset,
        pclass=OceanParticle,
        lon=lons,
        lat=lats,
        depth=depths,
        time=0
    )
    
    print(f"Released {num_particles} particles in {reg['name']}")
    
    return pset

def run_particle_simulation(fieldset, pset, runtime_days=365):
    """
    Run the particle tracking simulation
    
    Parameters:
    -----------
    fieldset : parcels.FieldSet
        Ocean velocity field
    pset : parcels.ParticleSet
        Initial particle set
    runtime_days : int
        Number of days to run simulation
    """
    
    runtime = timedelta(days=runtime_days)
    dt = timedelta(hours=1)  # 1-hour time step
    
    # Output file for particle trajectories
    output_file = pset.ParticleFile(
        name="perpetual_ocean_particles",
        outputdt=timedelta(days=1)  # Save daily positions
    )
    
    print(f"Running simulation for {runtime_days} days...")
    print(f"Time step: {dt}")
    
    # Execute simulation with 4th order Runge-Kutta advection
    pset.execute(
        AdRK4,
        runtime=runtime,
        dt=dt,
        output_file=output_file,
        recovery={
            'ErrorOutOfBounds': lambda p: p.delete(),
            'ErrorThroughSurface': lambda p: p.delete()
        }
    )
    
    print("Simulation complete!")
    return output_file

def visualize_trajectories(particle_file, region='global'):
    """
    Visualize particle trajectories similar to NASA's visualization
    
    Parameters:
    -----------
    particle_file : str
        Path to particle output file
    region : str
        'global' or specific region
    """
    
    # Load particle trajectory data
    import pandas as pd
    from netCDF4 import Dataset
    
    nc = Dataset(f"{particle_file}.nc")
    
    # Extract trajectory data
    lons = nc.variables['lon'][:]
    lats = nc.variables['lat'][:]
    depths = nc.variables['depth'][:]
    times = nc.variables['time'][:]
    
    # Create visualization
    fig = plt.figure(figsize=(16, 9))
    
    if region == 'global':
        m = Basemap(projection='robin', lon_0=0, resolution='c')
        m.drawmapboundary(fill_color='#1a1a2e')
        m.fillcontinents(color='#16213e', lake_color='#1a1a2e')
        m.drawcoastlines(linewidth=0.5, color='#4a4a6a')
    else:
        # Regional view
        m = Basemap(projection='merc', 
                    llcrnrlat=-60, urcrnrlat=60,
                    llcrnrlon=-180, urcrnrlon=180,
                    resolution='c')
        m.drawmapboundary(fill_color='#1a1a2e')
        m.fillcontinents(color='#16213e', lake_color='#1a1a2e')
    
    # Plot particle trails
    # Color based on depth (matching NASA's scheme)
    # Surface (<600m): white
    # Deep (>=600m): blue shades
    
    for i in range(min(1000, lons.shape[0])):  # Plot subset for performance
        particle_lon = lons[i, :]
        particle_lat = lats[i, :]
        particle_depth = depths[i, 0]
        
        # Convert to map coordinates
        x, y = m(particle_lon, particle_lat)
        
        # Color based on depth
        if particle_depth < 600:
            color = 'white'
            alpha = 0.6
        else:
            # Deeper = darker blue
            depth_factor = min(particle_depth / 3000, 1.0)
            color = plt.cm.Blues(1 - depth_factor * 0.7)
            alpha = 0.4
        
        # Plot trajectory trail
        m.plot(x, y, color=color, alpha=alpha, linewidth=0.5)
    
    plt.title("Ocean Current Particle Trajectories\n(Based on ECCO-2 Model)", 
              fontsize=14, color='white')
    plt.savefig("perpetual_ocean_simulation.png", 
                dpi=300, bbox_inches='tight', 
                facecolor='#0f0f1e')
    plt.close()
    
    print("Visualization saved as 'perpetual_ocean_simulation.png'")

def simplified_simulation():
    """
    Simplified simulation for demonstration without ECCO data
    Uses synthetic velocity field
    """
    
    print("Creating simplified ocean current simulation...")
    
    # Create synthetic velocity field
    # In practice, you would use real ECCO-2 data
    
    from parcels import FieldSet, ParticleSet, JITParticle, AdRK4
    
    # Define simple velocity field
    def create_synthetic_ocean_fieldset():
        """Create a synthetic ocean with major current systems"""
        
        # Grid definition
        lon = np.linspace(-180, 180, 360)
        lat = np.linspace(-80, 80, 320)
        depth = np.array([0, 100, 300, 600, 1000, 2000, 3000, 5000])
        time = np.arange(0, 365, 1)  # 1 year
        
        # Create meshgrid
        LON, LAT, DEPTH = np.meshgrid(lon, lat, depth, indexing='ij')
        
        # Initialize velocity fields
        U = np.zeros((len(time), len(lat), len(lon), len(depth)))
        V = np.zeros((len(time), len(lat), len(lon), len(depth)))
        W = np.zeros((len(time), len(lat), len(lon), len(depth)))
        
        # Add synthetic western boundary currents (Gulf Stream-like)
        # Strong northward flow on western boundary
        for t in range(len(time)):
            for d in range(len(depth)):
                # Gulf Stream approximation
                gulf_stream = np.exp(-((LAT - 35)**2) / 200) * \
                             np.exp(-((LON + 70)**2) / 1000)
                U[:, :, :, d] += 0.5 * gulf_stream * (1 + 0.3 * np.sin(t/30))
                V[:, :, :, d] += 0.3 * gulf_stream * (1 + 0.3 * np.sin(t/30))
                
                # Kuroshio Current
                kuroshio = np.exp(-((LAT - 30)**2) / 200) * \
                          np.exp(-((LON - 140)**2) / 1000)
                U[:, :, :, d] += 0.4 * kuroshio
                V[:, :, :, d] += 0.2 * kuroshio
                
                # Agulhas Current
                agulhas = np.exp(-((LAT + 35)**2) / 200) * \
                         np.exp(-((LON - 30)**2) / 500)
                U[:, :, :, d] += 0.3 * agulhas
                V[:, :, :, d] += -0.4 * agulhas
        
        # Add wind-driven surface currents (Ekman transport)
        for t in range(len(time)):
            # Surface layer only
            U[t, :, :, 0] += 0.1 * np.cos(LAT[:, :, 0] * np.pi / 180)
            V[t, :, :, 0] += 0.05 * np.sin(LAT[:, :, 0] * np.pi / 180)
        
        # Create FieldSet
        data = {'U': U, 'V': V, 'W': W}
        dimensions = {'lon': lon, 'lat': lat, 'depth': depth, 'time': time}
        
        fieldset = FieldSet.from_data(
            data, dimensions, 
            mesh='spherical',
            interp_method='linear'
        )
        
        return fieldset
    
    # Create fieldset
    fieldset = create_synthetic_ocean_fieldset()
    
    # Release particles globally
    num_particles = 5000
    lons = np.random.uniform(-180, 180, num_particles)
    lats = np.random.uniform(-60, 60, num_particles)
    depths = np.random.uniform(0, 3000, num_particles)
    
    pset = ParticleSet(
        fieldset=fieldset,
        pclass=OceanParticle,
        lon=lons,
        lat=lats,
        depth=depths
    )
    
    print(f"Released {num_particles} particles")
    
    # Run simulation for 90 days (shorter for demo)
    runtime = timedelta(days=90)
    dt = timedelta(hours=6)
    
    output_file = pset.ParticleFile(
        name="perpetual_ocean_demo",
        outputdt=timedelta(days=1)
    )
    
    print("Running simulation...")
    pset.execute(AdRK4, runtime=runtime, dt=dt, output_file=output_file)
    
    print("Demo simulation complete!")
    return output_file

# Main execution
if __name__ == "__main__":
    print("=" * 70)
    print("NASA Perpetual Ocean 2 - Particle Simulation")
    print("=" * 70)
    print("\nThis simulation replicates NASA's ocean current visualization")
    print("using Lagrangian particle tracking with ECCO-2 model data")
    print("\nKey Parameters:")
    print("  - Data Source: ECCO-2 (2021-2023)")
    print("  - Particle trail length: 3 days (surface), 6 days (deep)")
    print("  - Depth threshold: 600 meters")
    print("  - Advection scheme: 4th order Runge-Kutta")
    print("=" * 70 + "\n")
    
    # Option 1: Run simplified demo (no external data needed)
    print("Running demonstration simulation...")
    output = simplified_simulation()
    
    # Option 2: Run with real ECCO-2 data (requires data download)
    # Uncomment the following to use real data:
    """
    ecco_data_path = "/path/to/ecco2/data"
    start_date = datetime(2021, 1, 1)
    end_date = datetime(2023, 12, 31)
    
    # Create fieldset from ECCO-2
    fieldset = create_ecco_fieldset(ecco_data_path, start_date, end_date)
    
    # Choose particle release strategy:
    # Option A: Global release
    pset = create_global_particle_release(fieldset, num_particles=10000)
    
    # Option B: Regional release (e.g., Gulf Stream study)
    # pset = create_regional_particle_release(fieldset, region='gulf_stream', 
    #                                          num_particles=115000)
    
    # Run simulation
    output = run_particle_simulation(fieldset, pset, runtime_days=365)
    
    # Visualize results
    visualize_trajectories(output, region='global')
    """
    
    print("\n" + "=" * 70)
    print("Simulation complete!")
    print("Output files: perpetual_ocean_demo.nc")
    print("=" * 70)