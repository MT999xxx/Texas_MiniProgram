import AppDataSource from '../../data-source';

async function resetDatabase() {
    try {
        console.log('Initializing data source...');
        await AppDataSource.initialize();

        console.log('Dropping database schema...');
        await AppDataSource.dropDatabase();

        console.log('Database schema dropped successfully.');

        // Optional: Synchronize to create tables immediately? 
        // No, let migrations do it.

        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Error resetting database:', error);
        process.exit(1);
    }
}

resetDatabase();
