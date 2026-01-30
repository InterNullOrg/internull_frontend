// Service to check DKG node health and session status
import axios from 'axios';

const NODE_URLS = [
  process.env.REACT_APP_DKG_NODE_1_URL || 'http://localhost:8080',
  process.env.REACT_APP_DKG_NODE_2_URL || 'http://localhost:8081',
  process.env.REACT_APP_DKG_NODE_3_URL || 'http://localhost:8082'
];

class NodeHealthService {
  constructor() {
    this.nodeUrls = NODE_URLS;
    this.healthStatus = {};
  }

  async checkNodeHealth(nodeUrl, nodeIndex) {
    try {
      // Try to get node health
      const response = await axios.get(`${nodeUrl}/health`, {
        timeout: 5000 // 5 second timeout
      });

      // If we get a response, the node is healthy
      const isHealthy = response.status === 200;
      
      const status = {
        isHealthy: isHealthy,
        hasValidSession: isHealthy, // If health endpoint works, node has valid session
        nodeId: `node${nodeIndex}`,
        lastChecked: new Date().toISOString(),
        error: null,
        healthResponse: response.data
      };

      return status;
    } catch (error) {
      return {
        isHealthy: false,
        hasValidSession: false,
        nodeId: `node${nodeIndex}`,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  async checkAllNodes() {
    console.log('🏥 Checking health of all DKG nodes...');
    
    const healthChecks = await Promise.all(
      this.nodeUrls.map((url, index) => this.checkNodeHealth(url, index))
    );

    this.healthStatus = {};
    healthChecks.forEach((status, index) => {
      this.healthStatus[`node${index}`] = status;
      console.log(`Node ${index}:`, status.isHealthy ? '✅ Healthy' : '❌ Unhealthy', 
        status.hasValidSession ? '🔐 Session Active' : '🔓 No Session');
    });

    const healthyNodes = healthChecks.filter(s => s.isHealthy).length;
    const nodesWithSessions = healthChecks.filter(s => s.hasValidSession).length;

    console.log(`Summary: ${healthyNodes}/3 nodes healthy, ${nodesWithSessions}/3 have valid sessions`);

    return {
      allHealthy: healthyNodes === 3,
      allHaveSessions: nodesWithSessions === 3,
      healthyCount: healthyNodes,
      sessionCount: nodesWithSessions,
      nodes: this.healthStatus
    };
  }

  getHealthStatus() {
    return this.healthStatus;
  }

  async waitForHealthyNodes(maxAttempts = 10, delayMs = 2000) {
    console.log('⏳ Waiting for all nodes to be healthy...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const status = await this.checkAllNodes();
      
      if (status.allHealthy && status.allHaveSessions) {
        console.log('✅ All nodes are healthy with valid sessions!');
        return true;
      }

      console.log(`Attempt ${attempt}/${maxAttempts}: ${status.healthyCount}/3 healthy, ${status.sessionCount}/3 with sessions`);
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error('❌ Timeout waiting for healthy nodes');
    return false;
  }
}

export default new NodeHealthService();