package com.hoooon22.devzip.Service;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hoooon22.devzip.Model.ServerStart;
import com.hoooon22.devzip.Repository.ServerStartRepository;

@Service
public class ServerStartService {

    private static final Logger logger = LoggerFactory.getLogger(ServerStartService.class);
    
    @Autowired
    private ServerStartRepository serverStartRepository;

    @Transactional(readOnly = true)
    public List<ServerStart> getAllServerStarts() {
        List<ServerStart> serverStarts = serverStartRepository.findAll();

        // isEmpty?
        if (serverStarts.isEmpty()) {
            logger.info("No ServerStarts found");
        } else {
            logger.info("Found {} ServerStarts", serverStarts.size());
        }

        return serverStarts;
    }

    @Transactional
    public ServerStart addServerStart(ServerStart serverStart) {
        
        serverStart.setDate(LocalDateTime.now());

        logger.info("Adding new serverStart: {}", serverStart);
        ServerStart savedServerStart = serverStartRepository.save(serverStart);

        logger.info("ServerStart added successfully: {}", savedServerStart);
        return savedServerStart;
    }
}
