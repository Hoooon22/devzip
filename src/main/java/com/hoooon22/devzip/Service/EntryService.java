package com.hoooon22.devzip.Service;

import com.hoooon22.devzip.Model.Entry;
import com.hoooon22.devzip.Repository.EntryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EntryService {

    @Autowired
    private EntryRepository entryRepository;

    @Transactional(readOnly = true)
    public List<Entry> getAllEntries() {
        return entryRepository.findAll();
    }

    @Transactional
    public Entry addEntry(Entry entry) {
        // 여기서 IP를 설정해줍니다. 예제에서는 임의의 값으로 설정하겠습니다.
        entry.setIp("127.0.0.1");

        return entryRepository.save(entry);
    }
}
