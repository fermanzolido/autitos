<template>
  <div>
    <h1 class="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Admin/Factory View -->
      <template v-if="authStore.role === 'admin' || authStore.role === 'factory'">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Vehículos en Stock</h3>
          <p class="text-4xl font-bold text-blue-600">{{ vehiclesInStock }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Ventas Totales</h3>
          <p class="text-4xl font-bold text-green-600">{{ totalSales }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Días Promedio en Stock (Red)</h3>
          <p class="text-4xl font-bold text-orange-600">{{ avgDaysInStock }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Concesionarios</h3>
          <p class="text-4xl font-bold text-purple-600">{{ totalDealers }}</p>
        </div>
      </template>

      <!-- Dealer View -->
      <template v-if="authStore.role === 'dealer'">
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Vehículos en Stock</h3>
          <p class="text-4xl font-bold text-blue-600">{{ vehiclesInStock }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Ventas Totales</h3>
          <p class="text-4xl font-bold text-green-600">{{ totalSales }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
          <h3 class="text-lg font-semibold">Mis Días Promedio en Stock</h3>
          <p class="text-4xl font-bold text-indigo-600">{{ dealerAvgDaysInStock }}</p>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-md">
            <h3 class="text-lg font-semibold">Días Promedio en Stock (Territorio)</h3>
            <p class="text-4xl font-bold text-gray-600">{{ territoryAvgDaysInStock }}</p>
        </div>
      </template>
    </div>

    <div v-if="authStore.role === 'dealer'" class="mt-8 bg-white p-6 rounded-lg shadow-md">
      <h3 class="text-lg font-semibold mb-4">Mi Tendencia de Ventas (Últimos 6 meses)</h3>
      <canvas id="dealerSalesChart" ref="dealerSalesChartCanvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useVehicleStore } from '@/stores/vehicles'
import { useSaleStore } from '@/stores/sales'
import { useDealerStore } from '@/stores/dealers'
import Chart from 'chart.js/auto';

const authStore = useAuthStore()
const vehicleStore = useVehicleStore()
const saleStore = useSaleStore()
const dealerStore = useDealerStore()

const dealerSalesChartCanvas = ref(null);
let dealerSalesChart = null;

// --- Computed Properties for KPIs ---
const vehiclesInStock = computed(() => vehicleStore.vehicles.filter(v => v.status !== 'vendido').length);
const totalSales = computed(() => saleStore.items.length);
const totalDealers = computed(() => dealerStore.items.length);

const calculateAvgDays = (sales, allVehicles) => {
    if (!sales.length) return 0;
    let totalDays = 0;
    let count = 0;
    const soldVehicleIds = new Set(sales.map(s => s.vehicleId));

    allVehicles.filter(v => soldVehicleIds.has(v.id)).forEach(vehicle => {
        if (!vehicle.statusHistory) return;
        const arrivalEntry = vehicle.statusHistory.filter(h => h.status === 'enConcesionario').sort((a, b) => b.date.toDate() - a.date.toDate())[0];
        const saleEntry = vehicle.statusHistory.find(h => h.status === 'vendido');
        if (arrivalEntry && saleEntry && arrivalEntry.date && saleEntry.date) {
            const diffTime = Math.abs(saleEntry.date.toDate() - arrivalEntry.date.toDate());
            totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            count++;
        }
    });
    return count > 0 ? (totalDays / count).toFixed(1) : 0;
};

const avgDaysInStock = computed(() => {
    // To calculate network-wide average, we need all vehicles, not just the dealer's
    // This assumes that if the user is an admin/factory, the vehicleStore contains all vehicles.
    return calculateAvgDays(saleStore.items, vehicleStore.vehicles);
});

const dealerAvgDaysInStock = computed(() => {
    if (!authStore.userClaims?.dealerId) return 0;
    return calculateAvgDays(saleStore.items, vehicleStore.vehicles); // saleStore is already filtered for dealer
});

const territoryAvgDaysInStock = computed(() => {
    const dealer = dealerStore.items.find(d => d.id === authStore.userClaims?.dealerId);
    if (!dealer?.territory) return 0;
    // This calculation requires fetching all sales and all dealers, which is not efficient
    // for a dealer role. For this migration, we'll accept this inefficiency.
    // A better solution might involve a dedicated cloud function for this metric.
    const dealersInTerritory = dealerStore.items.filter(d => d.territory === dealer.territory).map(d => d.id);
    const territorySales = saleStore.items.filter(s => dealersInTerritory.includes(s.dealerId));
    return calculateAvgDays(territorySales, vehicleStore.vehicles);
});


const renderDealerSalesChart = () => {
    if (!dealerSalesChartCanvas.value) return;
    if (dealerSalesChart) dealerSalesChart.destroy();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const dealerSales = saleStore.items.filter(s =>
        s.saleDate && s.saleDate.toDate() > sixMonthsAgo
    );

    const salesByMonth = dealerSales.reduce((acc, sale) => {
        const month = sale.saleDate.toDate().toISOString().slice(0, 7);
        acc[month] = (acc[month] || 0) + 1;
        return acc;
    }, {});

    const labels = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        labels.push(d.toISOString().slice(0, 7));
    }

    const data = labels.map(label => salesByMonth[label] || 0);

    dealerSalesChart = new Chart(dealerSalesChartCanvas.value, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Mis Ventas',
                data,
                borderColor: 'rgba(79, 70, 229, 1)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true,
                tension: 0.1
            }]
        },
    });
};

onMounted(() => {
    if (authStore.role === 'dealer') {
        renderDealerSalesChart();
    }
});

watch(() => saleStore.items, () => {
    if (authStore.role === 'dealer') {
        renderDealerSalesChart();
    }
});

</script>
